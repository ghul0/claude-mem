import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { chmodSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AntigravityCliCaller } from '../../src/services/worker/llm/AntigravityCliCaller.js';
import { PiCaller } from '../../src/services/worker/llm/PiCaller.js';
import type { LlmCallRequest, LlmCaller, ProviderId } from '../../src/services/worker/llm/types.js';

let fixtureRoot: string;
let piSuccessExecutable: string;
let textSuccessExecutable: string;
let failureExecutable: string;
let hangingExecutable: string;

function writeExecutable(name: string, body: string): string {
  const filePath = join(fixtureRoot, name);
  writeFileSync(filePath, `#!/usr/bin/env bash\nset -eu\n${body}\n`, 'utf8');
  chmodSync(filePath, 0o755);
  return filePath;
}

function providerTempDirs(prefix: string): string[] {
  return readdirSync(tmpdir())
    .filter((entry) => entry.startsWith(prefix))
    .sort();
}

function request(overrides: Partial<LlmCallRequest> = {}): LlmCallRequest {
  return {
    systemPrompt: 'Return only the requested test response.',
    userPrompt: 'test prompt',
    mode: 'text',
    timeoutMs: 2_000,
    agentTag: 'provider-temp-cleanup-test',
    ...overrides,
  };
}

async function expectNoNewTempDirs(
  prefix: string,
  action: () => Promise<unknown>,
): Promise<void> {
  const before = providerTempDirs(prefix);
  try {
    await action();
  } finally {
    expect(providerTempDirs(prefix)).toEqual(before);
  }
}

beforeAll(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), 'claude-mem-provider-cleanup-fixtures-'));
  piSuccessExecutable = writeExecutable(
    'pi-success',
    `printf '%s\\n' '{"type":"message_end","message":{"role":"assistant","content":[{"type":"text","text":"ok"}]}}'`,
  );
  textSuccessExecutable = writeExecutable('text-success', 'cat >/dev/null\nprintf "ok\\n"');
  failureExecutable = writeExecutable('failure', 'printf "fixture failure\\n" >&2\nexit 7');
  hangingExecutable = writeExecutable('hanging', 'exec sleep 60');
});

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true });
});

type CallerFamily = {
  name: string;
  prefixFor: (providerId: string) => string;
  create: (providerId: ProviderId, executable: string) => LlmCaller;
  successExecutable: () => string;
};

const families: CallerFamily[] = [
  {
    name: 'PiCaller',
    prefixFor: (providerId) => `claude-mem-pi-${providerId}-`,
    create: (providerId, executable) => new PiCaller({
      providerId,
      modelName: 'test/provider',
      piExecutable: executable,
    }),
    successExecutable: () => piSuccessExecutable,
  },
  {
    name: 'AntigravityCliCaller',
    prefixFor: (providerId) => `claude-mem-${providerId}-`,
    create: (providerId, executable) => new AntigravityCliCaller({
      providerId,
      profile: providerId,
      cliExecutable: executable,
    }),
    successExecutable: () => textSuccessExecutable,
  },
];

for (const family of families) {
  describe(`${family.name} provider workspace cleanup`, () => {
    test('removes its temp directory after a successful exit', async () => {
      const providerId = `test-${family.name.toLowerCase()}-success` as ProviderId;
      const caller = family.create(providerId, family.successExecutable());

      await expectNoNewTempDirs(family.prefixFor(providerId), async () => {
        await expect(caller.call(request())).resolves.toBe('ok');
      });
    });

    test('removes its temp directory after a non-zero exit', async () => {
      const providerId = `test-${family.name.toLowerCase()}-failure` as ProviderId;
      const caller = family.create(providerId, failureExecutable);

      await expectNoNewTempDirs(family.prefixFor(providerId), async () => {
        await expect(caller.call(request())).rejects.toThrow('exited 7');
      });
    });

    test('removes its temp directory after a spawn error', async () => {
      const providerId = `test-${family.name.toLowerCase()}-spawn-error` as ProviderId;
      const caller = family.create(providerId, join(fixtureRoot, 'does-not-exist'));

      await expectNoNewTempDirs(family.prefixFor(providerId), async () => {
        await expect(caller.call(request())).rejects.toThrow('spawn failed');
      });
    });

    test('removes its temp directory after a timeout', async () => {
      const providerId = `test-${family.name.toLowerCase()}-timeout` as ProviderId;
      const caller = family.create(providerId, hangingExecutable);

      await expectNoNewTempDirs(family.prefixFor(providerId), async () => {
        await expect(caller.call(request({ timeoutMs: 30 }))).rejects.toThrow('timed out');
      });
    });

    test('removes its temp directory after an abort', async () => {
      const providerId = `test-${family.name.toLowerCase()}-abort` as ProviderId;
      const caller = family.create(providerId, hangingExecutable);
      const controller = new AbortController();

      await expectNoNewTempDirs(family.prefixFor(providerId), async () => {
        const call = caller.call(request({ abortSignal: controller.signal }));
        setTimeout(() => controller.abort(), 30);
        await expect(call).rejects.toThrow('aborted');
      });
    });
  });
}
