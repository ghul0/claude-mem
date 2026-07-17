import { spawn } from 'child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { logger } from '../../../utils/logger.js';
import { ClassifiedProviderError } from '../provider-errors.js';
import type { LlmCallRequest, LlmCaller, ProviderId } from './types.js';

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function textFromUnknown(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textFromUnknown).filter(Boolean).join('\n');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.text === 'string') return record.text;
    if (typeof record.content === 'string') return record.content;
    return textFromUnknown(record.content ?? record.message ?? record.result ?? record.value);
  }
  return '';
}

interface PiJsonExtractionResult {
  text: string;
  errorMessage: string | null;
}

function extractAssistantTextFromJsonEvents(stdout: string): PiJsonExtractionResult {
  const finalChunks: string[] = [];
  const deltaChunks: string[] = [];
  let errorMessage: string | null = null;
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as Record<string, any>;
      const message = event.message as Record<string, any> | undefined;
      const eventError = typeof event.errorMessage === 'string' ? event.errorMessage : null;
      const messageError = typeof message?.errorMessage === 'string' ? message.errorMessage : null;
      if (eventError || messageError) errorMessage = messageError || eventError;
      if (message?.stopReason === 'error' && messageError) errorMessage = messageError;
      if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
        const delta = textFromUnknown(event.assistantMessageEvent.delta);
        if (delta) deltaChunks.push(delta);
      } else if (event.type === 'message_end' && event.message?.role === 'assistant') {
        const text = textFromUnknown(event.message.content).trim();
        if (text) finalChunks.push(text);
      } else if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_end') {
        const text = textFromUnknown(event.assistantMessageEvent.content).trim();
        if (text) finalChunks.push(text);
      }
    } catch {
      // Ignore non-JSON lines.
    }
  }
  const longestFinal = finalChunks.reduce(
    (best, current) => (current.length > best.length ? current : best),
    '',
  );
  return {
    text: longestFinal.trim() || deltaChunks.join('').trim(),
    errorMessage,
  };
}

function classifyPiError(combined: string): 'quota_exhausted' | 'transient' | 'unrecoverable' {
  const lower = combined.toLowerCase();
  if (
    lower.includes('usage_limit') ||
    lower.includes('usage limit') ||
    lower.includes('rate limit') ||
    lower.includes('quota') ||
    lower.includes('out of extra usage') ||
    lower.includes('resource_exhausted')
  ) {
    return 'quota_exhausted';
  }
  if (lower.includes('context') && lower.includes('window')) return 'unrecoverable';
  return 'transient';
}

function extractRetryAfterMs(combined: string): number | undefined {
  const secondsMatch = combined.match(/"resets_in_seconds"\s*:\s*(\d+)/);
  if (secondsMatch) {
    const seconds = Number.parseInt(secondsMatch[1], 10);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  }
  const resetsAtMatch = combined.match(/"resets_at"\s*:\s*(\d+)/);
  if (resetsAtMatch) {
    const epoch = Number.parseInt(resetsAtMatch[1], 10);
    if (Number.isFinite(epoch) && epoch > 0) {
      const delta = epoch * 1000 - Date.now();
      if (delta > 0) return delta;
    }
  }
  return undefined;
}

export class PiCaller implements LlmCaller {
  readonly providerId: ProviderId;
  readonly modelName: string;
  private piExecutable: string;
  private thinking: string;
  private extensionPaths: string[];

  constructor(args: { providerId: ProviderId; modelName: string; piExecutable?: string; thinking?: string; extensionPaths?: string[] }) {
    this.providerId = args.providerId;
    this.modelName = args.modelName;
    this.piExecutable = args.piExecutable ?? 'pi';
    this.thinking = args.thinking ?? 'off';
    this.extensionPaths = args.extensionPaths ?? [];
  }

  async call(req: LlmCallRequest): Promise<string> {
    const tempDir = mkdtempSync(join(tmpdir(), `claude-mem-pi-${this.providerId}-`));
    const systemPath = join(tempDir, 'system.md');
    const promptPath = join(tempDir, 'prompt.md');
    const stdoutPath = join(tempDir, 'stdout.txt');
    const stderrPath = join(tempDir, 'stderr.txt');
    writeFileSync(systemPath, req.systemPrompt, 'utf8');
    writeFileSync(promptPath, req.userPrompt, 'utf8');
    writeFileSync(stdoutPath, '', 'utf8');
    writeFileSync(stderrPath, '', 'utf8');

    // Providers backed by a pi extension (minimax, claude-bridge) need the
    // extension loaded explicitly; --no-extensions would strip the provider.
    const requiresExtensions = this.modelName.startsWith('claude-agent-sdk/') || this.extensionPaths.length > 0;
    const args = [
      ...(requiresExtensions ? [] : ['--no-extensions']),
      ...this.extensionPaths.flatMap((p) => ['--extension', p]),
      '--no-session',
      '--no-context-files',
      '--no-skills',
      '--no-tools',
      '--system-prompt', systemPath,
      '--model', this.modelName,
      '--thinking', this.thinking,
      '--mode', 'json',
      '-p', `@${promptPath}`,
    ];

    logger.debug('CHAIN', `PiCaller starting subprocess`, {
      provider: this.providerId,
      model: this.modelName,
      command: `${this.piExecutable} ${args.map(shellQuote).join(' ')}`,
      agentTag: req.agentTag,
    });

    const stdoutFd = openSync(stdoutPath, 'a');
    const stderrFd = openSync(stderrPath, 'a');

    return await new Promise<string>((resolve, reject) => {
      let settled = false;
      const child = spawn(this.piExecutable, args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          CLAUDE_MEM_PI_PROVIDER_ACTIVE: '1',
          CLAUDE_MEM_INTERNAL_AGENT: req.agentTag ?? 'pi-caller',
        },
        stdio: ['ignore', stdoutFd, stderrFd],
      });

      const readOutput = () => ({
        stdout: readFileSync(stdoutPath, 'utf8'),
        stderr: readFileSync(stderrPath, 'utf8'),
      });

      const cleanup = () => {
        try { closeSync(stdoutFd); } catch { /* ignore */ }
        try { closeSync(stderrFd); } catch { /* ignore */ }
        try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
      };

      const onAbort = () => {
        if (settled) return;
        settled = true;
        try { child.kill('SIGTERM'); } catch { /* ignore */ }
        cleanup();
        reject(new ClassifiedProviderError(`${this.providerId} aborted`, { kind: 'transient', cause: new Error('aborted') }));
      };
      req.abortSignal?.addEventListener('abort', onAbort, { once: true });

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { child.kill('SIGTERM'); } catch { /* ignore */ }
        req.abortSignal?.removeEventListener('abort', onAbort);
        const { stderr } = readOutput();
        cleanup();
        reject(new ClassifiedProviderError(
          `${this.providerId} timed out after ${req.timeoutMs}ms${stderr ? `: ${stderr.slice(-1000)}` : ''}`,
          { kind: 'transient', cause: new Error('timeout') },
        ));
      }, req.timeoutMs);

      child.on('error', (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        req.abortSignal?.removeEventListener('abort', onAbort);
        cleanup();
        reject(new ClassifiedProviderError(
          `${this.providerId} spawn failed: ${error.message}`,
          { kind: 'transient', cause: error },
        ));
      });

      child.on('exit', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        req.abortSignal?.removeEventListener('abort', onAbort);
        const { stdout, stderr } = readOutput();
        cleanup();
        if (code !== 0) {
          const combined = `${stderr}\n${stdout}`;
          const retryAfterMs = extractRetryAfterMs(combined);
          reject(new ClassifiedProviderError(
            `${this.providerId} exited ${code ?? 'unknown'}: ${(stderr || stdout).slice(-2000)}`,
            {
              kind: classifyPiError(combined),
              cause: new Error(stderr || stdout),
              ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
            },
          ));
          return;
        }
        const extracted = extractAssistantTextFromJsonEvents(stdout);
        if (extracted.errorMessage && !extracted.text) {
          const retryAfterMs = extractRetryAfterMs(`${stdout}\n${extracted.errorMessage}`);
          reject(new ClassifiedProviderError(
            `${this.providerId} returned error event: ${extracted.errorMessage.slice(0, 2000)}`,
            {
              kind: classifyPiError(extracted.errorMessage),
              cause: new Error(extracted.errorMessage),
              ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
            },
          ));
          return;
        }
        resolve(extracted.text);
      });
    });
  }
}
