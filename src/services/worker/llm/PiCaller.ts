import { spawn } from 'child_process';
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'fs';
import { homedir, tmpdir } from 'os';
import { join } from 'path';
import { logger } from '../../../utils/logger.js';
import { sanitizeEnv } from '../../../supervisor/env-sanitizer.js';
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
    lower.includes('resource_exhausted') ||
    lower.includes('insufficient_balance') ||
    lower.includes('insufficient balance') ||
    /(^|\D)402(\D|$)/.test(lower)
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

function linkOrCopyCredential(sourcePath: string, targetPath: string): void {
  if (!existsSync(sourcePath)) return;
  try {
    symlinkSync(sourcePath, targetPath, 'file');
  } catch {
    copyFileSync(sourcePath, targetPath);
    try { chmodSync(targetPath, 0o600); } catch { /* best effort on Windows */ }
  }
}

function prepareIsolatedAgentDir(tempDir: string, modelName: string): string {
  const agentDir = join(tempDir, 'pi-agent');
  mkdirSync(agentDir, { recursive: true, mode: 0o700 });
  writeFileSync(join(agentDir, 'settings.json'), JSON.stringify({
    enabledModels: [modelName],
    retry: {
      enabled: false,
      maxRetries: 0,
      provider: { maxRetries: 0, maxRetryDelayMs: 0 },
    },
    defaultProjectTrust: 'never',
    enableInstallTelemetry: false,
  }, null, 2), { encoding: 'utf8', mode: 0o600 });

  const sourceAgentDir = process.env.PI_CODING_AGENT_DIR?.trim() || join(homedir(), '.pi', 'agent');
  linkOrCopyCredential(join(sourceAgentDir, 'auth.json'), join(agentDir, 'auth.json'));
  linkOrCopyCredential(join(sourceAgentDir, 'models.json'), join(agentDir, 'models.json'));
  return agentDir;
}

function splitQualifiedModel(modelName: string): { provider?: string; model: string } {
  const separator = modelName.indexOf('/');
  if (separator <= 0 || separator === modelName.length - 1) return { model: modelName };
  return {
    provider: modelName.slice(0, separator),
    model: modelName.slice(separator + 1),
  };
}

export class PiCaller implements LlmCaller {
  readonly providerId: ProviderId;
  readonly modelName: string;
  readonly extensionPaths: string[];
  private piExecutable: string;
  private thinking: string;

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
    const isolatedAgentDir = prepareIsolatedAgentDir(tempDir, this.modelName);
    const qualifiedModel = splitQualifiedModel(this.modelName);

    // --no-extensions still permits explicit -e paths. Keeping discovery off
    // prevents unrelated user extensions and model scopes from entering this
    // background subprocess.
    const args = [
      '--no-extensions',
      ...this.extensionPaths.flatMap((p) => ['--extension', p]),
      '--no-session',
      '--no-context-files',
      '--no-skills',
      '--no-tools',
      '--system-prompt', systemPath,
      ...(qualifiedModel.provider ? ['--provider', qualifiedModel.provider] : []),
      '--model', qualifiedModel.model,
      '--models', this.modelName,
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
          ...sanitizeEnv(process.env),
          PI_CODING_AGENT_DIR: isolatedAgentDir,
          PI_SKIP_VERSION_CHECK: '1',
          PI_TELEMETRY: '0',
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
        const extracted = extractAssistantTextFromJsonEvents(stdout);
        if (code !== 0) {
          const combined = `${stderr}\n${stdout}`;
          const retryAfterMs = extractRetryAfterMs(combined);
          const detail = extracted.errorMessage || stdout.trim() || stderr.trim();
          reject(new ClassifiedProviderError(
            `${this.providerId} exited ${code ?? 'unknown'}: ${detail.slice(-2000)}`,
            {
              kind: classifyPiError(combined),
              cause: new Error(detail),
              ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
            },
          ));
          return;
        }
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
