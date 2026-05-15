import { Database } from 'bun:sqlite';
import { stripTags } from '../../../utils/tag-stripping.js';
import { logger } from '../../../utils/logger.js';
import { storeObservationEvidence } from './evidence-store.js';
import { enqueueReconcileJob } from './jobs-store.js';
import { isReconciliationEnabled } from './settings.js';
import type {
  ObservationEvidenceBundle,
  ObservationToolTraceEntry
} from './types.js';

const DEFAULT_USER_PROMPT_TRUNCATE_BYTES = 8000;
const DEFAULT_ASSISTANT_MESSAGE_TRUNCATE_BYTES = 8000;
const DEFAULT_TOOL_RESULT_TRUNCATE_BYTES = 50000;

export interface BuildEvidenceBundleInput {
  pendingMessageId: number | null;
  contentSessionId: string | null;
  promptNumber: number | null;
  project: string;
  platformSource: string | null;
  userPrompt: string | null;
  assistantMessage: string | null;
  toolTrace: ObservationToolTraceEntry[];
  filesRead: string[];
  filesModified: string[];
}

function truncate(input: string | null, maxBytes: number): { value: string | null; truncated: boolean } {
  if (input === null) return { value: null, truncated: false };
  if (input.length <= maxBytes) return { value: input, truncated: false };
  const marker = `\n…[truncated ${input.length - maxBytes} chars]`;
  return { value: input.slice(0, maxBytes) + marker, truncated: true };
}

function sanitizeText(input: string | null, maxBytes: number): { value: string | null; truncated: boolean } {
  if (input === null) return { value: null, truncated: false };
  const stripped = stripTags(input).stripped;
  if (!stripped) return { value: null, truncated: false };
  return truncate(stripped, maxBytes);
}

function sanitizeToolTrace(entries: ObservationToolTraceEntry[]): { trace: ObservationToolTraceEntry[]; truncated: boolean } {
  let truncated = false;
  const trace = entries.map((entry): ObservationToolTraceEntry => {
    const resultText = entry.toolResultText !== null
      ? sanitizeText(entry.toolResultText, DEFAULT_TOOL_RESULT_TRUNCATE_BYTES)
      : { value: null, truncated: false };
    if (resultText.truncated) truncated = true;
    const originalBytes = entry.toolResultText?.length ?? undefined;
    const storedBytes = resultText.value?.length ?? undefined;
    return {
      toolUseId: entry.toolUseId,
      toolName: entry.toolName,
      toolInput: entry.toolInput,
      toolResultText: resultText.value,
      toolResultDetails: entry.toolResultDetails,
      isError: entry.isError,
      filesRead: entry.filesRead,
      filesModified: entry.filesModified,
      truncation: resultText.truncated
        ? { truncated: true, originalBytes, storedBytes }
        : entry.truncation
    };
  });
  return { trace, truncated };
}

export function buildEvidenceBundle(input: BuildEvidenceBundleInput): ObservationEvidenceBundle {
  const userPrompt = sanitizeText(input.userPrompt, DEFAULT_USER_PROMPT_TRUNCATE_BYTES);
  const assistantMessage = sanitizeText(input.assistantMessage, DEFAULT_ASSISTANT_MESSAGE_TRUNCATE_BYTES);
  const toolTrace = sanitizeToolTrace(input.toolTrace);
  const truncated = userPrompt.truncated || assistantMessage.truncated || toolTrace.truncated;

  return {
    pendingMessageId: input.pendingMessageId,
    contentSessionId: input.contentSessionId,
    promptNumber: input.promptNumber,
    project: input.project,
    platformSource: input.platformSource,
    userPrompt: userPrompt.value,
    assistantMessage: assistantMessage.value,
    toolTrace: toolTrace.trace,
    filesRead: input.filesRead,
    filesModified: input.filesModified,
    truncated
  };
}

export interface PersistReconciliationInput {
  db: Database;
  observations: Array<{ files_read: string[]; files_modified: string[] }>;
  observationIds: number[];
  insertedIds: number[];
  project: string;
  contentSessionId: string | null;
  platformSource: string | null;
  promptNumber: number | null;
  userPrompt: string | null;
  assistantMessage: string | null;
  toolTrace?: ObservationToolTraceEntry[];
  pendingMessageId?: number | null;
}

export function persistReconciliationEvidenceAndJobs(input: PersistReconciliationInput): {
  evidenceStored: number;
  jobsEnqueued: number;
} {
  if (!isReconciliationEnabled()) {
    return { evidenceStored: 0, jobsEnqueued: 0 };
  }
  if (input.insertedIds.length === 0) {
    return { evidenceStored: 0, jobsEnqueued: 0 };
  }

  const insertedSet = new Set(input.insertedIds);
  let evidenceStored = 0;
  let jobsEnqueued = 0;

  for (let i = 0; i < input.observations.length; i++) {
    const obsId = input.observationIds[i];
    if (obsId === undefined || !insertedSet.has(obsId)) continue;
    const obs = input.observations[i];
    try {
      const bundle = buildEvidenceBundle({
        pendingMessageId: input.pendingMessageId ?? null,
        contentSessionId: input.contentSessionId,
        promptNumber: input.promptNumber,
        project: input.project,
        platformSource: input.platformSource,
        userPrompt: input.userPrompt,
        assistantMessage: input.assistantMessage,
        toolTrace: input.toolTrace ?? [],
        filesRead: obs.files_read,
        filesModified: obs.files_modified
      });
      storeObservationEvidence(input.db, obsId, bundle);
      evidenceStored += 1;

      const enq = enqueueReconcileJob(input.db, {
        observationId: obsId,
        project: input.project
      });
      if (enq.inserted) jobsEnqueued += 1;
    } catch (error) {
      logger.warn(
        'RECONCILE',
        'Failed to persist reconciliation evidence/job for observation',
        { observationId: obsId, project: input.project },
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  return { evidenceStored, jobsEnqueued };
}
