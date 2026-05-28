import { logger } from '../../../utils/logger.js';
import { SettingsDefaultsManager } from '../../../shared/SettingsDefaultsManager.js';
import { ClassifiedProviderError, isClassified } from '../provider-errors.js';
import { AntigravityCliCaller } from './AntigravityCliCaller.js';
import { PiCaller } from './PiCaller.js';
import { globalProviderChain, ProviderChain } from './ProviderChain.js';
import type { LlmCallRequest, LlmCallResult, LlmCaller, ProviderId } from './types.js';

const MAX_WAIT_FOR_RESET_MS = 65 * 60 * 1000;
const DEFAULT_VALIDATION_RETRIES = 6;

function buildRetryPrompt(originalPrompt: string, previousResponse: string, feedback: string, attempt: number): string {
  const preview = previousResponse.slice(0, 360).replace(/\s+/g, ' ').trim();
  return `${originalPrompt}

---

VALIDATION FAILED (retry ${attempt}). Your previous response was REJECTED.

Your previous response (first 360 chars): "${preview}..."

WHY IT WAS REJECTED: ${feedback}

Re-emit the response NOW. Match the schema EXACTLY — same top-level key name, same field names, same shape. Do not invent alternative keys. Do not paraphrase the schema. Do not classify when only IDs were asked for. Output ONLY the JSON object. No prose, no markdown code fences, no commentary, no explanation, no preamble, no postamble. Keep string fields short (max 200 chars) so the payload fits in the model's token budget. Do not echo the original prompt.`;
}

function buildCallerFor(providerId: ProviderId): LlmCaller {
  switch (providerId) {
    case 'antigravity-tm-oss':
      return new AntigravityCliCaller({ providerId: 'antigravity-tm-oss', profile: 'tm-oss' });
    case 'antigravity-ghul-oss':
      return new AntigravityCliCaller({ providerId: 'antigravity-ghul-oss', profile: 'ghul-oss' });
    case 'antigravity-tm':
      return new AntigravityCliCaller({ providerId: 'antigravity-tm', profile: 'tm' });
    case 'antigravity-ghul':
      return new AntigravityCliCaller({ providerId: 'antigravity-ghul', profile: 'ghul' });
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
        const text = await this.callWithValidation(caller, req);
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

  private async callWithValidation(caller: LlmCaller, req: LlmCallRequest): Promise<string> {
    if (!req.validate) {
      return await caller.call(req);
    }

    const maxRetries = req.maxValidationRetries ?? readDefaultValidationRetries();
    let text = await caller.call(req);
    let attempt = 1;

    while (attempt <= maxRetries) {
      const result = req.validate(text);
      if (result.valid) {
        if (attempt > 1) {
          logger.info('CHAIN', 'Validator passed after retry', {
            provider: caller.providerId,
            model: caller.modelName,
            attempt,
            agentTag: req.agentTag,
          });
        }
        return text;
      }

      logger.warn('CHAIN', 'Validator rejected response, retrying same provider with feedback', {
        provider: caller.providerId,
        model: caller.modelName,
        attempt,
        agentTag: req.agentTag,
        feedback: (result.feedback ?? '').slice(0, 240),
        previewBytes: text.length,
        responsePreview: text.slice(0, 600).replace(/\s+/g, ' '),
      });

      const retryPrompt = buildRetryPrompt(req.userPrompt, text, result.feedback ?? 'Response did not match the required format.', attempt);
      attempt += 1;
      text = await caller.call({ ...req, userPrompt: retryPrompt });
    }

    const finalResult = req.validate(text);
    if (finalResult.valid) {
      logger.info('CHAIN', 'Validator passed on final retry', {
        provider: caller.providerId,
        model: caller.modelName,
        attempts: attempt,
        agentTag: req.agentTag,
      });
    } else {
      logger.warn('CHAIN', 'Validator still failing after max retries; passing last response downstream', {
        provider: caller.providerId,
        model: caller.modelName,
        attempts: attempt,
        agentTag: req.agentTag,
        feedback: (finalResult.feedback ?? '').slice(0, 240),
      });
    }
    return text;
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

function readDefaultValidationRetries(): number {
  const raw = SettingsDefaultsManager.getInt('CLAUDE_MEM_VALIDATION_RETRIES');
  if (Number.isFinite(raw) && raw >= 0) return raw;
  return DEFAULT_VALIDATION_RETRIES;
}

export const globalCallerChain = new CallerChain();
