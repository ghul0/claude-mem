import { spawn } from 'child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { logger } from '../../../utils/logger.js';
import { SettingsDefaultsManager } from '../../../shared/SettingsDefaultsManager.js';
import { ClassifiedProviderError } from '../provider-errors.js';
import type { LlmCallRequest, LlmCaller, ProviderId } from './types.js';

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function classifyGeminiCliError(combined: string): 'quota_exhausted' | 'transient' | 'unrecoverable' | 'auth_invalid' {
  const lower = combined.toLowerCase();
  if (
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('429')
  ) return 'quota_exhausted';
  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthenticated')
  ) return 'auth_invalid';
  if (lower.includes('context') && lower.includes('limit')) return 'unrecoverable';
  return 'transient';
}

function extractGeminiResponse(stdout: string): { text: string; errorMessage: string | null } {
  const trimmed = stdout.trim();
  if (!trimmed) return { text: '', errorMessage: null };
  try {
    const parsed = JSON.parse(trimmed) as { response?: unknown; error?: unknown };
    const response = typeof parsed.response === 'string' ? parsed.response.trim() : '';
    const error = typeof parsed.error === 'string' ? parsed.error
      : parsed.error && typeof parsed.error === 'object' && 'message' in parsed.error
        ? String((parsed.error as { message: unknown }).message)
        : null;
    if (response) return { text: response, errorMessage: error };
    if (error) return { text: '', errorMessage: error };
    return { text: '', errorMessage: 'gemini-cli returned empty response field' };
  } catch {
    return { text: trimmed, errorMessage: null };
  }
}

export class GeminiCliCaller implements LlmCaller {
  readonly providerId: ProviderId = 'gemini-cli';
  readonly modelName: string;
  private cliExecutable: string;

  constructor(args: { modelName?: string; cliExecutable?: string } = {}) {
    const settingsModel = SettingsDefaultsManager.get('CLAUDE_MEM_GEMINI_CLI_MODEL');
    this.modelName = args.modelName ?? settingsModel ?? 'gemini-2.5-flash-lite';
    this.cliExecutable = args.cliExecutable ?? 'gemini';
  }

  async call(req: LlmCallRequest): Promise<string> {
    const tempDir = mkdtempSync(join(tmpdir(), 'claude-mem-gemini-cli-'));
    const stdoutPath = join(tempDir, 'stdout.txt');
    const stderrPath = join(tempDir, 'stderr.txt');
    writeFileSync(stdoutPath, '', 'utf8');
    writeFileSync(stderrPath, '', 'utf8');

    const combinedPrompt = `${req.systemPrompt.trim()}\n\n---\n\n${req.userPrompt}`;

    const args = [
      '--approval-mode', 'plan',
      '--skip-trust',
      '-m', this.modelName,
      '-o', 'json',
      '-p', '',
    ];

    logger.debug('CHAIN', `GeminiCliCaller starting subprocess`, {
      model: this.modelName,
      command: `${this.cliExecutable} ${args.map(shellQuote).join(' ')}`,
      promptBytes: combinedPrompt.length,
      agentTag: req.agentTag,
    });

    const stdoutFd = openSync(stdoutPath, 'a');
    const stderrFd = openSync(stderrPath, 'a');

    return await new Promise<string>((resolve, reject) => {
      let settled = false;
      const child = spawn(this.cliExecutable, args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          CLAUDE_MEM_GEMINI_CLI_ACTIVE: '1',
          CLAUDE_MEM_INTERNAL_AGENT: req.agentTag ?? 'gemini-cli-caller',
        },
        stdio: ['pipe', stdoutFd, stderrFd],
      });

      if (child.stdin) {
        child.stdin.on('error', () => { /* swallow EPIPE if subprocess exits early */ });
        child.stdin.end(combinedPrompt);
      }

      const cleanup = () => {
        try { closeSync(stdoutFd); } catch { /* ignore */ }
        try { closeSync(stderrFd); } catch { /* ignore */ }
      };

      const readOutput = () => ({
        stdout: readFileSync(stdoutPath, 'utf8'),
        stderr: readFileSync(stderrPath, 'utf8'),
      });

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
          reject(new ClassifiedProviderError(
            `${this.providerId} exited ${code ?? 'unknown'}: ${(stderr || stdout).slice(-2000)}`,
            { kind: classifyGeminiCliError(combined), cause: new Error(stderr || stdout) },
          ));
          return;
        }
        const extracted = extractGeminiResponse(stdout);
        if (extracted.errorMessage && !extracted.text) {
          reject(new ClassifiedProviderError(
            `${this.providerId} returned error: ${extracted.errorMessage.slice(0, 2000)}`,
            { kind: classifyGeminiCliError(extracted.errorMessage), cause: new Error(extracted.errorMessage) },
          ));
          return;
        }
        resolve(extracted.text);
      });
    });
  }
}
