import { Database } from 'bun:sqlite';
import { logger } from '../../../utils/logger.js';
import type { ObservationStatus, ObservationRelationKind } from './types.js';
import type { ReconciliationSettings } from './settings.js';
import { validateTerminalEvidence } from './status-validator.js';

export interface ApplyDecisionInput {
  db: Database;
  targetObservationId: number;
  sourceObservationId: number;
  relation: ObservationRelationKind;
  confidence: number;
  evidence: string;
  reason: string;
  settings: ReconciliationSettings;
  overrideTimestampEpoch?: number;
}

export interface ApplyDecisionOutcome {
  applied: boolean;
  previousStatus: ObservationStatus;
  newStatus: ObservationStatus;
  reasonNotApplied: string | null;
}

const NON_TERMINAL: ReadonlySet<ObservationStatus> = new Set(['active', 'weak', 'stale']);

function readCurrentStatus(db: Database, observationId: number): ObservationStatus | null {
  const row = db.prepare('SELECT status FROM observations WHERE id = ?').get(observationId) as
    | { status: string | null }
    | null;
  if (!row) return null;
  return (row.status ?? 'active') as ObservationStatus;
}

function persistStatusChange(
  db: Database,
  targetId: number,
  newStatus: ObservationStatus,
  confidence: number,
  reason: string,
  supersededById: number | null,
  now: number
): void {
  db.prepare(`
    UPDATE observations
       SET status                       = ?,
           status_confidence            = ?,
           status_reason                = ?,
           status_updated_at_epoch      = ?,
           superseded_by_observation_id = COALESCE(?, superseded_by_observation_id),
           reconciled_at_epoch          = ?
     WHERE id = ?
  `).run(newStatus, confidence, reason, now, supersededById, now, targetId);
}

export function applyClassifierDecisionToObservation(input: ApplyDecisionInput): ApplyDecisionOutcome {
  const currentStatus = readCurrentStatus(input.db, input.targetObservationId);
  if (currentStatus === null) {
    return {
      applied: false,
      previousStatus: 'active',
      newStatus: 'active',
      reasonNotApplied: 'observation_not_found'
    };
  }

  if (!NON_TERMINAL.has(currentStatus)) {
    return {
      applied: false,
      previousStatus: currentStatus,
      newStatus: currentStatus,
      reasonNotApplied: 'target_in_terminal_status'
    };
  }

  if (!input.settings.apply) {
    return {
      applied: false,
      previousStatus: currentStatus,
      newStatus: currentStatus,
      reasonNotApplied: 'apply_disabled'
    };
  }

  if (input.relation === 'no_relation' || input.relation === 'confirms') {
    return {
      applied: false,
      previousStatus: currentStatus,
      newStatus: currentStatus,
      reasonNotApplied: 'relation_has_no_status_effect'
    };
  }

  if (input.confidence < input.settings.minWeakConfidence) {
    return {
      applied: false,
      previousStatus: currentStatus,
      newStatus: currentStatus,
      reasonNotApplied: 'below_min_weak_confidence'
    };
  }

  const evidenceCheck = validateTerminalEvidence(input.evidence, input.settings.minTerminalEvidenceChars);
  const meetsTerminalThreshold = input.confidence >= input.settings.minApplyConfidence;

  let newStatus: ObservationStatus | null = null;
  let supersededBy: number | null = null;
  let chosenReason = '';

  if (meetsTerminalThreshold && evidenceCheck.valid) {
    if (input.relation === 'supersedes') {
      newStatus = 'superseded';
      supersededBy = input.sourceObservationId;
      chosenReason = `Auto-superseded by #${input.sourceObservationId}: ${input.reason}`;
    } else if (input.relation === 'contradicts') {
      newStatus = 'deprecated';
      chosenReason = `Auto-deprecated by #${input.sourceObservationId}: ${input.reason}`;
    } else if (input.relation === 'weakens') {
      newStatus = 'weak';
      chosenReason = `Auto-weakened by #${input.sourceObservationId}: ${input.reason}`;
    }
  } else {
    newStatus = 'weak';
    const notTerminalReason = meetsTerminalThreshold
      ? `evidence_validation_failed:${evidenceCheck.reason}`
      : 'below_min_apply_confidence';
    chosenReason = `Auto-weakened by #${input.sourceObservationId} (${notTerminalReason}): ${input.reason}`;
  }

  if (newStatus === null) {
    return {
      applied: false,
      previousStatus: currentStatus,
      newStatus: currentStatus,
      reasonNotApplied: 'no_transition'
    };
  }

  if (newStatus === currentStatus) {
    return {
      applied: false,
      previousStatus: currentStatus,
      newStatus: currentStatus,
      reasonNotApplied: 'status_unchanged'
    };
  }

  if (currentStatus === 'weak' && newStatus === 'weak') {
    return {
      applied: false,
      previousStatus: currentStatus,
      newStatus: currentStatus,
      reasonNotApplied: 'status_unchanged'
    };
  }

  const now = input.overrideTimestampEpoch ?? Date.now();
  persistStatusChange(
    input.db,
    input.targetObservationId,
    newStatus,
    input.confidence,
    chosenReason,
    supersededBy,
    now
  );

  logger.debug('RECONCILE', 'Applied observation status transition', {
    targetId: input.targetObservationId,
    sourceId: input.sourceObservationId,
    previousStatus: currentStatus,
    newStatus,
    relation: input.relation,
    confidence: input.confidence
  });

  return {
    applied: true,
    previousStatus: currentStatus,
    newStatus,
    reasonNotApplied: null
  };
}
