import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  NoopReconciliationLlmCaller,
  createReconciliationCallerFromSettings
} from '../../src/services/sqlite/reconciliation/llm-caller.js';
import { PiReconciliationLlmCaller } from '../../src/services/sqlite/reconciliation/pi-llm-caller.js';

const FLAG_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED';
const MODEL_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_MODEL';

describe('createReconciliationCallerFromSettings', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    saved[FLAG_KEY] = process.env[FLAG_KEY];
    saved[MODEL_KEY] = process.env[MODEL_KEY];
    delete process.env[FLAG_KEY];
    delete process.env[MODEL_KEY];
  });
  afterEach(() => {
    for (const k of [FLAG_KEY, MODEL_KEY]) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('returns Noop when disabled', async () => {
    const caller = await createReconciliationCallerFromSettings();
    expect(caller).toBeInstanceOf(NoopReconciliationLlmCaller);
  });

  it('returns Noop when enabled but model is empty', async () => {
    process.env[FLAG_KEY] = 'true';
    const caller = await createReconciliationCallerFromSettings();
    expect(caller).toBeInstanceOf(NoopReconciliationLlmCaller);
  });

  it('returns PiReconciliationLlmCaller when enabled with model', async () => {
    process.env[FLAG_KEY] = 'true';
    process.env[MODEL_KEY] = 'openai-codex/gpt-5.4-mini';
    const caller = await createReconciliationCallerFromSettings();
    expect(caller).toBeInstanceOf(PiReconciliationLlmCaller);
  });
});
