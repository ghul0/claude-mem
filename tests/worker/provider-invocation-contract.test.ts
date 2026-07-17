import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { chmodSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AntigravityCliCaller } from '../../src/services/worker/llm/AntigravityCliCaller.js';
import { PiCaller } from '../../src/services/worker/llm/PiCaller.js';
import { ClassifiedProviderError } from '../../src/services/worker/provider-errors.js';
import type { LlmCallRequest } from '../../src/services/worker/llm/types.js';

let fixtureRoot: string;
let argvProbe: string;
let piProbe: string;
let piBalanceError: string;

function writeExecutable(name: string, source: string): string {
  const path = join(fixtureRoot, name);
  writeFileSync(path, `#!/usr/bin/env node\n${source}\n`, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

function request(overrides: Partial<LlmCallRequest> = {}): LlmCallRequest {
  return {
    systemPrompt: 'SYSTEM-CONTRACT',
    userPrompt: 'USER-CONTRACT',
    mode: 'json',
    timeoutMs: 2_000,
    agentTag: 'provider-invocation-contract',
    ...overrides,
  };
}

beforeAll(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), 'claude-mem-provider-contract-'));

  argvProbe = writeExecutable('argv-probe', `
const args = process.argv.slice(2);
const printIndex = args.indexOf('--print');
const printArg = printIndex >= 0 ? args[printIndex + 1] ?? null : null;
process.stdout.write(JSON.stringify({
  args,
  printArg,
  printArgBytes: printArg === null ? null : Buffer.byteLength(printArg),
}) + '\\n');
`);

  piProbe = writeExecutable('pi-probe', `
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const agentDir = process.env.PI_CODING_AGENT_DIR;
const settings = agentDir
  ? JSON.parse(fs.readFileSync(path.join(agentDir, 'settings.json'), 'utf8'))
  : null;
const auth = agentDir && fs.existsSync(path.join(agentDir, 'auth.json'))
  ? JSON.parse(fs.readFileSync(path.join(agentDir, 'auth.json'), 'utf8'))
  : null;
const text = JSON.stringify({
  args,
  agentDir,
  settings,
  auth,
  skipVersionCheck: process.env.PI_SKIP_VERSION_CHECK,
  telemetry: process.env.PI_TELEMETRY,
});
process.stdout.write(JSON.stringify({
  type: 'message_end',
  message: { role: 'assistant', content: [{ type: 'text', text }] },
}) + '\\n');
`);

  piBalanceError = writeExecutable('pi-balance-error', `
process.stdout.write(JSON.stringify({
  type: 'message_end',
  message: {
    role: 'assistant',
    content: [],
    stopReason: 'error',
    errorMessage: '402: {"type":"insufficient_balance_error","message":"insufficient balance (1008)"}',
  },
}) + '\\n');
`);
});

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true });
});

describe('AntigravityCliCaller agy 1.1.3 invocation contract', () => {
  test('passes the prompt as the non-empty --print argv value', async () => {
    const caller = new AntigravityCliCaller({
      providerId: 'antigravity-tm',
      profile: 'tm',
      cliExecutable: argvProbe,
    });

    const result = JSON.parse(await caller.call(request()));
    expect(result.printArg).toContain('SYSTEM-CONTRACT');
    expect(result.printArg).toContain('USER-CONTRACT');
  });

  test('bounds an oversized prompt below the per-argument OS limit while preserving both ends', async () => {
    const caller = new AntigravityCliCaller({
      providerId: 'antigravity-tm',
      profile: 'tm',
      cliExecutable: argvProbe,
    });

    const result = JSON.parse(await caller.call(request({
      userPrompt: `PROMPT-START:${'x'.repeat(180_000)}:PROMPT-END`,
    })));
    expect(result.printArgBytes).toBeLessThanOrEqual(96 * 1024);
    expect(result.printArg).toContain('SYSTEM-CONTRACT');
    expect(result.printArg).toContain('PROMPT-END');
    expect(result.printArg).toContain('prompt truncated for agy argv safety');
  });
});

describe('PiCaller subprocess isolation and exact model routing', () => {
  test('pins provider/model scope and disables nested Pi retries without using global Pi settings', async () => {
    const sourceAgentDir = join(fixtureRoot, 'source-agent');
    mkdirSync(sourceAgentDir, { recursive: true });
    writeFileSync(join(sourceAgentDir, 'auth.json'), JSON.stringify({ marker: 'test-auth' }), 'utf8');
    writeFileSync(join(sourceAgentDir, 'settings.json'), JSON.stringify({
      enabledModels: ['openrouter/forbidden'],
      retry: { enabled: true, maxRetries: 9 },
    }), 'utf8');

    const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
    process.env.PI_CODING_AGENT_DIR = sourceAgentDir;
    try {
      const caller = new PiCaller({
        providerId: 'codex-mini',
        modelName: 'openai-codex/gpt-5.4-mini',
        piExecutable: piProbe,
      });
      const probe = JSON.parse(await caller.call(request()));

      expect(probe.agentDir).not.toBe(sourceAgentDir);
      expect(probe.settings.enabledModels).toEqual(['openai-codex/gpt-5.4-mini']);
      expect(probe.settings.retry).toMatchObject({
        enabled: false,
        maxRetries: 0,
        provider: { maxRetries: 0 },
      });
      expect(probe.auth).toEqual({ marker: 'test-auth' });
      expect(probe.skipVersionCheck).toBe('1');
      expect(probe.telemetry).toBe('0');

      const providerIndex = probe.args.indexOf('--provider');
      const modelIndex = probe.args.indexOf('--model');
      const modelsIndex = probe.args.indexOf('--models');
      expect(probe.args.slice(providerIndex, providerIndex + 2)).toEqual(['--provider', 'openai-codex']);
      expect(probe.args.slice(modelIndex, modelIndex + 2)).toEqual(['--model', 'gpt-5.4-mini']);
      expect(probe.args.slice(modelsIndex, modelsIndex + 2)).toEqual(['--models', 'openai-codex/gpt-5.4-mini']);
    } finally {
      if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
      else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
    }
  });

  test('uses the direct MiniMax provider instead of fuzzy-matching OpenRouter', async () => {
    const caller = new PiCaller({
      providerId: 'minimax-m3',
      modelName: 'minimax/MiniMax-M3',
      piExecutable: piProbe,
    });
    const probe = JSON.parse(await caller.call(request()));

    const providerIndex = probe.args.indexOf('--provider');
    const modelIndex = probe.args.indexOf('--model');
    expect(probe.args.slice(providerIndex, providerIndex + 2)).toEqual(['--provider', 'minimax']);
    expect(probe.args.slice(modelIndex, modelIndex + 2)).toEqual(['--model', 'MiniMax-M3']);
    expect(probe.args.join(' ')).not.toContain('openrouter');
  });

  test('classifies MiniMax insufficient balance as quota exhaustion, not a transient retry', async () => {
    const caller = new PiCaller({
      providerId: 'minimax-m3',
      modelName: 'minimax/MiniMax-M3',
      piExecutable: piBalanceError,
    });

    try {
      await caller.call(request());
      throw new Error('expected PiCaller to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ClassifiedProviderError);
      expect((error as ClassifiedProviderError).kind).toBe('quota_exhausted');
    }
  });
});
