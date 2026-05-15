import { Database } from 'bun:sqlite';
import type {
  ObservationRelationInput,
  ObservationRelationKind,
  ObservationRelationRow
} from './types.js';

export function upsertObservationRelation(
  db: Database,
  input: ObservationRelationInput,
  overrideTimestampEpoch?: number
): ObservationRelationRow {
  const now = overrideTimestampEpoch ?? Date.now();
  const nowIso = new Date(now).toISOString();
  const row = db.prepare(`
    INSERT INTO observation_relations (
      source_observation_id, target_observation_id, relation,
      confidence, evidence, reason, action_applied, model,
      created_at, created_at_epoch
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_observation_id, target_observation_id, relation) DO UPDATE SET
      confidence       = excluded.confidence,
      evidence         = excluded.evidence,
      reason           = excluded.reason,
      action_applied   = excluded.action_applied,
      model            = excluded.model,
      updated_at       = excluded.created_at,
      updated_at_epoch = excluded.created_at_epoch
    RETURNING *
  `).get(
    input.sourceObservationId,
    input.targetObservationId,
    input.relation,
    input.confidence,
    input.evidence,
    input.reason,
    input.actionApplied ?? null,
    input.model ?? null,
    nowIso,
    now
  ) as ObservationRelationRow;
  return row;
}

export function listRelationsBySource(
  db: Database,
  sourceObservationId: number
): ObservationRelationRow[] {
  return db.prepare(
    'SELECT * FROM observation_relations WHERE source_observation_id = ? ORDER BY id ASC'
  ).all(sourceObservationId) as ObservationRelationRow[];
}

export function listRelationsByTarget(
  db: Database,
  targetObservationId: number
): ObservationRelationRow[] {
  return db.prepare(
    'SELECT * FROM observation_relations WHERE target_observation_id = ? ORDER BY id ASC'
  ).all(targetObservationId) as ObservationRelationRow[];
}

export function listRelationsByKind(
  db: Database,
  relation: ObservationRelationKind
): ObservationRelationRow[] {
  return db.prepare(
    'SELECT * FROM observation_relations WHERE relation = ? ORDER BY created_at_epoch DESC'
  ).all(relation) as ObservationRelationRow[];
}

export function getRelation(
  db: Database,
  sourceObservationId: number,
  targetObservationId: number,
  relation: ObservationRelationKind
): ObservationRelationRow | null {
  return db.prepare(`
    SELECT * FROM observation_relations
    WHERE source_observation_id = ? AND target_observation_id = ? AND relation = ?
  `).get(sourceObservationId, targetObservationId, relation) as ObservationRelationRow | null;
}
