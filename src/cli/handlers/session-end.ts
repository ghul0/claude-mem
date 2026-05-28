import type { EventHandler, NormalizedHookInput, HookResult } from '../types.js';
import { executeWithWorkerFallback, isWorkerFallback } from '../../shared/worker-utils.js';
import { logger } from '../../utils/logger.js';
import { HOOK_EXIT_CODES } from '../../shared/hook-constants.js';

export const sessionEndHandler: EventHandler = {
  async execute(input: NormalizedHookInput): Promise<HookResult> {
    if (
      process.env.CLAUDE_MEM_PI_PROVIDER_ACTIVE === '1' ||
      process.env.CLAUDE_MEM_PI_CURATOR_ACTIVE === '1' ||
      process.env.CLAUDE_MEM_INTERNAL_AGENT
    ) {
      return { continue: true, suppressOutput: true, exitCode: HOOK_EXIT_CODES.SUCCESS };
    }

    const { sessionId, reason } = input;
    if (!sessionId) {
      logger.debug('HOOK', 'session-end: no sessionId, skipping');
      return { continue: true, suppressOutput: true, exitCode: HOOK_EXIT_CODES.SUCCESS };
    }

    const result = await executeWithWorkerFallback<{ status?: string; finalized?: number }>(
      '/api/sessions/finalize',
      'POST',
      { contentSessionId: sessionId, reason: reason ?? 'session-end' },
    );

    if (isWorkerFallback(result)) {
      return { continue: true, suppressOutput: true, exitCode: HOOK_EXIT_CODES.SUCCESS };
    }

    logger.debug('HOOK', 'session-end: finalize requested', {
      sessionId,
      reason,
      finalized: result?.finalized,
    });
    return { continue: true, suppressOutput: true, exitCode: HOOK_EXIT_CODES.SUCCESS };
  },
};
