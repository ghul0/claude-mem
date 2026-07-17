import { afterEach, describe, expect, test } from 'bun:test';
import { CallerChain } from '../../src/services/worker/llm/CallerChain.js';
import { ProviderChain } from '../../src/services/worker/llm/ProviderChain.js';
import type { LlmCallRequest, LlmCaller, ProviderId } from '../../src/services/worker/llm/types.js';

const FALLBACK_KEY = 'CLAUDE_MEM_FALLBACK_CHAIN';
const savedFallback = process.env[FALLBACK_KEY];

afterEach(() => {
  if (savedFallback === undefined) delete process.env[FALLBACK_KEY];
  else process.env[FALLBACK_KEY] = savedFallback;
});

function request(): LlmCallRequest {
  return {
    systemPrompt: 'system',
    userPrompt: 'prompt',
    mode: 'json',
    timeoutMs: 2_000,
    agentTag: 'caller-chain-concurrency-test',
  };
}

describe('CallerChain provider leases', () => {
  test('a provider cannot be acquired twice before the first call releases it', () => {
    const store = new ProviderChain();
    const acquire = (store as any).tryAcquireNextAvailable;
    expect(typeof acquire).toBe('function');

    const chain: ProviderId[] = ['codex-mini'];
    expect(acquire.call(store, chain)).toBe('codex-mini');
    expect(acquire.call(store, chain)).toBeNull();
  });

  test('concurrent calls never execute the same provider simultaneously', async () => {
    process.env[FALLBACK_KEY] = 'codex-mini';
    const store = new ProviderChain();
    let active = 0;
    let maxActive = 0;
    let calls = 0;

    const factory = (providerId: ProviderId): LlmCaller => ({
      providerId,
      modelName: 'test/model',
      async call() {
        calls += 1;
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 20));
        active -= 1;
        return 'ok';
      },
    });

    const chain = new CallerChain(store, factory);
    const [first, second] = await Promise.all([chain.call(request()), chain.call(request())]);

    expect(first.text).toBe('ok');
    expect(second.text).toBe('ok');
    expect(calls).toBe(2);
    expect(maxActive).toBe(1);
  });
});
