import { Database } from 'bun:sqlite';
import type { ObservationStatus } from './types.js';

export interface ObservationStatusAuditRow {
  id: number;
  observation_id: number;
  previous_status: string | null;
  new_status: string;
  reason: string;
  actor: string;
  source_observation_id: number | null;
  created_at: string;
  created_at_epoch: number;
}

export interface RecordStatusAuditInput {
  observationId: number;
  previousStatus: ObservationStatus | null;
  newStatus: ObservationStatus;
  reason: string;
  actor: string;
  sourceObservationId?: number | null;
}

export function recordObservationStatusAudit(
  db: Database,
  input: RecordStatusAuditInput,
  overrideTimestampEpoch?: number
): number {
  const now = overrideTimestampEpoch ?? Date.now();
  const result = db.prepare(`
    INSERT INTO observation_status_audit (
      observation_id, previous_status, new_status, reason, actor,
      source_observation_id, created_at, created_at_epoch
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.observationId,
    input.previousStatus ?? null,
    input.newStatus,
    input.reason,
    input.actor,
    input.sourceObservationId ?? null,
    new Date(now).toISOString(),
    now
  );
  return Number(result.lastInsertRowid);
}

export function listStatusAudit(
  db: Database,
  observationId: number
): ObservationStatusAuditRow[] {
  return db.prepare(`
    SELECT * FROM observation_status_audit
    WHERE observation_id = ?
    ORDER BY created_at_epoch DESC, id DESC
  `).all(observationId) as ObservationStatusAuditRow[];
}
