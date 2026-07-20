import { describe, expect, test } from 'bun:test';
import { homedir } from 'os';
import { join } from 'path';
import { createCallerForProvider } from '../../src/services/worker/llm/CallerChain.js';
import { PiCaller } from '../../src/services/worker/llm/PiCaller.js';

const PI_NPM_MODULES = join(homedir(), '.pi', 'agent', 'npm', 'node_modules');

describe('createCallerForProvider extension wiring', () => {
  test('minimax-m3 loads the pi-minimax-provider extension, matching claude-haiku', () => {
    const minimax = createCallerForProvider('minimax-m3');
    expect(minimax).toBeInstanceOf(PiCaller);
    expect((minimax as PiCaller).extensionPaths).toEqual([
      join(PI_NPM_MODULES, '@sinamtz', 'pi-minimax-provider', 'dist', 'index.js'),
    ]);

    const claudeHaiku = createCallerForProvider('claude-haiku');
    expect((claudeHaiku as PiCaller).extensionPaths).toEqual([
      join(PI_NPM_MODULES, 'pi-claude-bridge', 'src', 'index.ts'),
    ]);
  });

  test('codex-mini and codex-spark load no extensions', () => {
    for (const providerId of ['codex-mini', 'codex-spark'] as const) {
      const caller = createCallerForProvider(providerId);
      expect((caller as PiCaller).extensionPaths).toEqual([]);
    }
  });
});
