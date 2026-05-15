import { Database } from 'bun:sqlite';
import { logger } from '../../../utils/logger.js';
import type { ObservationStatus } from './types.js';
import { OBSERVATION_STATUSES } from './types.js';
import { recordObservationStatusAudit } from './audit-store.js';

export interface ManualStatusPatchInput {
  observationId: number;
  newStatus: ObservationStatus;
  reason: string;
  actor: string;
  supersededByObservationId?: number | null;
  overrideTimestampEpoch?: number;
}

export type ManualStatusPatchError =
  | 'observation_not_found'
  | 'invalid_status'
  | 'missing_reason'
  | 'missing_actor';

export interface ManualStatusPatchResult {
  applied: boolean;
  previousStatus: ObservationStatus | null;
  newStatus: ObservationStatus | null;
  auditId: number | null;
  error: ManualStatusPatchError | null;
}

const VALID_STATUSES: ReadonlySet<string> = new Set(OBSERVATION_STATUSES);

export function applyManualStatusPatch(
  db: Database,
  input: ManualStatusPatchInput
): ManualStatusPatchResult {
  if (!VALID_STATUSES.has(input.newStatus)) {
    return { applied: false, previousStatus: null, newStatus: null, auditId: null, error: 'invalid_status' };
  }
  if (!input.reason || input.reason.trim().length === 0) {
    return { applied: false, previousStatus: null, newStatus: null, auditId: null, error: 'missing_reason' };
  }
  if (!input.actor || input.actor.trim().length === 0) {
    return { applied: false, previousStatus: null, newStatus: null, auditId: null, error: 'missing_actor' };
  }

  const row = db.prepare('SELECT status FROM observations WHERE id = ?').get(input.observationId) as
    | { status: string | null }
    | null;
  if (!row) {
    return { applied: false, previousStatus: null, newStatus: null, auditId: null, error: 'observation_not_found' };
  }

  const previousStatus = (row.status ?? 'active') as ObservationStatus;
  const now = input.overrideTimestampEpoch ?? Date.now();

  db.prepare(`
    UPDATE observations
       SET status                       = ?,
           status_reason                = ?,
           status_updated_at_epoch      = ?,
           superseded_by_observation_id = COALESCE(?, superseded_by_observation_id),
           reconciled_at_epoch          = ?
     WHERE id = ?
  `).run(
    input.newStatus,
    input.reason,
    now,
    input.supersededByObservationId ?? null,
    now,
    input.observationId
  );

  const auditId = recordObservationStatusAudit(
    db,
    {
      observationId: input.observationId,
      previousStatus,
      newStatus: input.newStatus,
      reason: input.reason,
      actor: input.actor,
      sourceObservationId: input.supersededByObservationId ?? null
    },
    now
  );

  logger.debug('RECONCILE', 'Manual status patch applied', {
    observationId: input.observationId,
    actor: input.actor,
    previousStatus,
    newStatus: input.newStatus
  });

  return {
    applied: true,
    previousStatus,
    newStatus: input.newStatus,
    auditId,
    error: null
  };
}
