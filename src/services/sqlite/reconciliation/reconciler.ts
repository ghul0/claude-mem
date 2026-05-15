import { Database } from 'bun:sqlite';
import { logger } from '../../../utils/logger.js';
import {
  loadObservationForReconcile,
  loadProjectCandidateCatalogue,
  countNonTerminalProjectObservations,
  type CatalogueObservation
} from './catalogue.js';
import {
  scoreCandidatesDeterministically,
  unionCandidates,
  chunkCandidates
} from './scoring.js';
import { getObservationEvidence } from './evidence-store.js';
import { upsertObservationRelation } from './relations-store.js';
import { applyClassifierDecisionToObservation } from './status-application.js';
import { getDailyCostUsd } from './cost-store.js';
import {
  loadReconciliationSettings,
  resolvedSelectorModel,
  resolvedClassifierModel
} from './settings.js';
import type {
  ReconciliationLlmCaller,
  RelationClassifierDecision
} from './llm-caller.js';
import type {
  ObservationEvidenceBundle,
  ObservationEvidenceRow
} from './types.js';

export interface ProcessJobOutcome {
  status: 'completed' | 'skipped';
  reason: string | null;
  candidatePoolSize: number;
  decisionsRecorded: number;
}

export interface ReconcileJobContext {
  observationId: number;
  project: string;
}

function evidenceRowToBundle(row: ObservationEvidenceRow | null): ObservationEvidenceBundle | null {
  if (!row) return null;
  let toolTrace: ObservationEvidenceBundle['toolTrace'] = [];
  if (row.tool_trace_json) {
    try {
      const parsed = JSON.parse(row.tool_trace_json);
      if (Array.isArray(parsed)) toolTrace = parsed;
    } catch {
      toolTrace = [];
    }
  }
  let filesRead: string[] = [];
  let filesModified: string[] = [];
  try {
    if (row.files_read_json) filesRead = JSON.parse(row.files_read_json);
  } catch { filesRead = []; }
  try {
    if (row.files_modified_json) filesModified = JSON.parse(row.files_modified_json);
  } catch { filesModified = []; }
  return {
    pendingMessageId: row.pending_message_id,
    contentSessionId: row.content_session_id,
    promptNumber: row.prompt_number,
    project: row.project,
    platformSource: row.platform_source,
    userPrompt: row.user_prompt,
    assistantMessage: row.assistant_message,
    toolTrace,
    filesRead,
    filesModified,
    truncated: Boolean(row.truncated)
  };
}

export async function processSingleReconcileJob(
  db: Database,
  ctx: ReconcileJobContext,
  caller: ReconciliationLlmCaller,
  vectorTopKIds: number[] = []
): Promise<ProcessJobOutcome> {
  const settings = loadReconciliationSettings();

  if (!settings.enabled) {
    return { status: 'skipped', reason: 'reconciliation_disabled', candidatePoolSize: 0, decisionsRecorded: 0 };
  }

  if (settings.killSwitch) {
    return { status: 'skipped', reason: 'kill_switch_active', candidatePoolSize: 0, decisionsRecorded: 0 };
  }

  if (settings.dailyBudgetUsd > 0) {
    const spent = getDailyCostUsd(db);
    if (spent >= settings.dailyBudgetUsd) {
      return {
        status: 'skipped',
        reason: 'daily_budget_exceeded',
        candidatePoolSize: 0,
        decisionsRecorded: 0
      };
    }
  }

  const selectorModel = resolvedSelectorModel(settings);
  const classifierModel = resolvedClassifierModel(settings);
  if (!selectorModel || !classifierModel) {
    return {
      status: 'skipped',
      reason: 'no_reconciliation_model_configured',
      candidatePoolSize: 0,
      decisionsRecorded: 0
    };
  }

  const newObservation = loadObservationForReconcile(db, ctx.observationId);
  if (!newObservation) {
    return { status: 'skipped', reason: 'observation_not_found', candidatePoolSize: 0, decisionsRecorded: 0 };
  }

  const projectCount = countNonTerminalProjectObservations(db, ctx.project);
  if (projectCount > settings.maxProjectObs) {
    return {
      status: 'skipped',
      reason: 'project_observation_limit_exceeded',
      candidatePoolSize: 0,
      decisionsRecorded: 0
    };
  }

  const fullCatalogue = loadProjectCandidateCatalogue(db, ctx.project, ctx.observationId);
  if (fullCatalogue.length === 0) {
    return { status: 'completed', reason: null, candidatePoolSize: 0, decisionsRecorded: 0 };
  }

  const catalogueById = new Map<number, CatalogueObservation>();
  for (const obs of fullCatalogue) catalogueById.set(obs.id, obs);

  const scored = scoreCandidatesDeterministically({
    newObservation,
    candidates: fullCatalogue,
    recentLimit: settings.deterministicRecentLimit,
    topCap: settings.deterministicTop
  });

  const selectorPool = settings.fullScanLlm
    ? fullCatalogue
    : unionCandidates(scored, vectorTopKIds, Math.max(settings.deterministicTop + settings.vectorTopK, 1), catalogueById);

  if (selectorPool.length === 0) {
    return { status: 'completed', reason: null, candidatePoolSize: 0, decisionsRecorded: 0 };
  }

  const evidence = evidenceRowToBundle(getObservationEvidence(db, ctx.observationId));

  const chunks = chunkCandidates(selectorPool, settings.candidateChunkSize);
  const selectedCandidateIds = new Set<number>();
  for (const chunk of chunks) {
    const selectorResponse = await caller.selectCandidates({
      newObservation,
      evidence,
      candidates: chunk,
      model: selectorModel
    });
    for (const id of selectorResponse.candidateIds) {
      if (catalogueById.has(id)) selectedCandidateIds.add(id);
    }
    if (selectedCandidateIds.size >= settings.maxCandidates) break;
  }

  const cappedCandidates: CatalogueObservation[] = [];
  for (const id of selectedCandidateIds) {
    const obs = catalogueById.get(id);
    if (!obs) continue;
    cappedCandidates.push(obs);
    if (cappedCandidates.length >= settings.maxCandidates) break;
  }

  if (cappedCandidates.length === 0) {
    return {
      status: 'completed',
      reason: null,
      candidatePoolSize: selectorPool.length,
      decisionsRecorded: 0
    };
  }

  const classifierResponse = await caller.classifyRelations({
    newObservation,
    evidence,
    candidates: cappedCandidates,
    model: classifierModel
  });

  let decisionsRecorded = 0;
  for (const decision of classifierResponse.decisions) {
    if (!isValidDecision(decision)) {
      logger.warn('RECONCILE', 'Discarded invalid classifier decision', {
        observationId: ctx.observationId
      });
      continue;
    }
    if (!catalogueById.has(decision.oldObservationId)) {
      logger.warn('RECONCILE', 'Classifier referenced observation not in catalogue', {
        observationId: ctx.observationId,
        oldObservationId: decision.oldObservationId
      });
      continue;
    }
    const clampedConfidence = clampConfidence(decision.confidence);
    const applyOutcome = applyClassifierDecisionToObservation({
      db,
      targetObservationId: decision.oldObservationId,
      sourceObservationId: ctx.observationId,
      relation: decision.relation,
      confidence: clampedConfidence,
      evidence: decision.evidence,
      reason: decision.reason,
      settings
    });
    upsertObservationRelation(db, {
      sourceObservationId: ctx.observationId,
      targetObservationId: decision.oldObservationId,
      relation: decision.relation,
      confidence: clampedConfidence,
      evidence: decision.evidence,
      reason: decision.reason,
      actionApplied: applyOutcome.applied ? applyOutcome.newStatus : null,
      model: classifierModel
    });
    decisionsRecorded += 1;
  }

  return {
    status: 'completed',
    reason: null,
    candidatePoolSize: selectorPool.length,
    decisionsRecorded
  };
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function isValidDecision(decision: RelationClassifierDecision | null | undefined): decision is RelationClassifierDecision {
  if (!decision) return false;
  if (typeof decision.oldObservationId !== 'number') return false;
  if (typeof decision.relation !== 'string') return false;
  const allowed = new Set(['supersedes', 'contradicts', 'weakens', 'confirms', 'no_relation']);
  if (!allowed.has(decision.relation)) return false;
  if (typeof decision.confidence !== 'number') return false;
  if (typeof decision.evidence !== 'string') return false;
  if (typeof decision.reason !== 'string') return false;
  return true;
}
