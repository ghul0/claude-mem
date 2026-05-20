import { logger } from '../../../utils/logger.js';
import { ClassifiedProviderError, isClassified } from '../provider-errors.js';
import { GeminiCliCaller } from './GeminiCliCaller.js';
import { PiCaller } from './PiCaller.js';
import { globalProviderChain, ProviderChain } from './ProviderChain.js';
import type { LlmCallRequest, LlmCallResult, LlmCaller, ProviderId } from './types.js';

const MAX_WAIT_FOR_RESET_MS = 65 * 60 * 1000;

function buildCallerFor(providerId: ProviderId): LlmCaller {
  switch (providerId) {
    case 'gemini-cli':
      return new GeminiCliCaller();
    case 'codex-spark':
      return new PiCaller({ providerId: 'codex-spark', modelName: 'openai-codex/gpt-5.3-codex-spark' });
    case 'codex-mini':
      return new PiCaller({ providerId: 'codex-mini', modelName: 'openai-codex/gpt-5.4-mini' });
  }
}

export class CallerChain {
  constructor(private readonly chainStore: ProviderChain = globalProviderChain) {}

  async call(req: LlmCallRequest): Promise<LlmCallResult> {
    const chain = this.chainStore.parseChainSetting();
    if (chain.length === 0) {
      throw new Error('CallerChain: no providers configured in CLAUDE_MEM_FALLBACK_CHAIN');
    }

    let lastError: unknown = null;
    let attempts = 0;
    const triedInThisCall = new Set<ProviderId>();

    while (true) {
      if (req.abortSignal?.aborted) {
        throw new ClassifiedProviderError('CallerChain aborted by caller', { kind: 'transient', cause: new Error('aborted') });
      }

      const next = this.chainStore.getNextAvailable(chain);

      if (!next) {
        const earliest = this.chainStore.getEarliestReset(chain);
        if (earliest === null) {
          throw lastError instanceof Error ? lastError : new Error('CallerChain: chain empty after exhaustion');
        }
        const now = Date.now();
        const waitMs = earliest - now;
        if (waitMs <= 0) continue;
        if (waitMs > MAX_WAIT_FOR_RESET_MS) {
          throw new ClassifiedProviderError(
            `All providers cooling down; earliest reset in ${Math.round(waitMs / 1000)}s exceeds wait cap`,
            { kind: 'quota_exhausted', cause: lastError },
          );
        }
        logger.warn('CHAIN', 'All providers cooling down, waiting for earliest reset', {
          waitMs,
          earliestResetAt: new Date(earliest).toISOString(),
          status: this.chainStore.status(),
          agentTag: req.agentTag,
        });
        await waitWithAbort(waitMs, req.abortSignal);
        triedInThisCall.clear();
        continue;
      }

      if (triedInThisCall.has(next)) {
        await waitWithAbort(250, req.abortSignal);
      }
      triedInThisCall.add(next);

      const caller = buildCallerFor(next);
      attempts++;
      try {
        logger.debug('CHAIN', 'Attempting provider', {
          provider: next,
          model: caller.modelName,
          attempt: attempts,
          agentTag: req.agentTag,
        });
        const text = await caller.call(req);
        if (attempts > 1) {
          logger.info('CHAIN', 'Recovered via fallback provider', {
            provider: next,
            model: caller.modelName,
            attempts,
            agentTag: req.agentTag,
          });
        }
        return { text, provider: next, model: caller.modelName };
      } catch (error) {
        lastError = error;
        const classified = isClassified(error) ? error : new ClassifiedProviderError(
          error instanceof Error ? error.message : String(error),
          { kind: 'transient', cause: error },
        );
        const retryAfterMs = classified.retryAfterMs;
        this.chainStore.markCoolingDown(next, classified.kind, `${classified.kind}: ${classified.message.slice(0, 200)}`, retryAfterMs);
        logger.warn('CHAIN', 'Provider failed, rotating to next', {
          provider: next,
          kind: classified.kind,
          model: caller.modelName,
          agentTag: req.agentTag,
          message: classified.message.slice(0, 300),
        });
      }
    }
  }
}

function waitWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ClassifiedProviderError('CallerChain aborted while waiting', { kind: 'transient', cause: new Error('aborted') }));
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new ClassifiedProviderError('CallerChain aborted while waiting', { kind: 'transient', cause: new Error('aborted') }));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export const globalCallerChain = new CallerChain();
