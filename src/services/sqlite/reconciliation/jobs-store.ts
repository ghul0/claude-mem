import { Database } from 'bun:sqlite';
import type {
  ObservationReconcileJobRow,
  ObservationReconcileJobStatus
} from './types.js';

export interface EnqueueReconcileJobInput {
  observationId: number;
  project: string;
}

export interface EnqueueReconcileJobResult {
  jobId: number;
  inserted: boolean;
}

export function enqueueReconcileJob(
  db: Database,
  input: EnqueueReconcileJobInput,
  overrideTimestampEpoch?: number
): EnqueueReconcileJobResult {
  const now = overrideTimestampEpoch ?? Date.now();
  const result = db.prepare(`
    INSERT INTO observation_reconcile_jobs (
      observation_id, project, status, attempts,
      created_at_epoch, updated_at_epoch
    ) VALUES (?, ?, 'pending', 0, ?, ?)
    ON CONFLICT(observation_id) DO NOTHING
    RETURNING id
  `).get(input.observationId, input.project, now, now) as { id: number } | null;

  if (result) {
    return { jobId: result.id, inserted: true };
  }
  const existing = db.prepare(
    'SELECT id FROM observation_reconcile_jobs WHERE observation_id = ?'
  ).get(input.observationId) as { id: number } | null;
  if (!existing) {
    throw new Error(
      `enqueueReconcileJob: ON CONFLICT fired but no existing row for observation_id=${input.observationId}`
    );
  }
  return { jobId: existing.id, inserted: false };
}

export function claimNextReconcileJob(
  db: Database,
  overrideTimestampEpoch?: number
): ObservationReconcileJobRow | null {
  const now = overrideTimestampEpoch ?? Date.now();
  const claimed = db.prepare(`
    UPDATE observation_reconcile_jobs
       SET status = 'processing',
           attempts = attempts + 1,
           locked_at_epoch = ?,
           updated_at_epoch = ?
     WHERE id = (
       SELECT id FROM observation_reconcile_jobs
        WHERE status IN ('pending', 'failed')
        ORDER BY created_at_epoch ASC, id ASC
        LIMIT 1
     )
     RETURNING *
  `).get(now, now) as ObservationReconcileJobRow | null;
  return claimed;
}

export function markJobCompleted(
  db: Database,
  jobId: number,
  overrideTimestampEpoch?: number
): number {
  const now = overrideTimestampEpoch ?? Date.now();
  return db.prepare(`
    UPDATE observation_reconcile_jobs
       SET status = 'completed',
           updated_at_epoch = ?,
           completed_at_epoch = ?,
           last_error = NULL
     WHERE id = ?
  `).run(now, now, jobId).changes;
}

export function markJobFailed(
  db: Database,
  jobId: number,
  errorMessage: string,
  overrideTimestampEpoch?: number
): number {
  const now = overrideTimestampEpoch ?? Date.now();
  return db.prepare(`
    UPDATE observation_reconcile_jobs
       SET status = 'failed',
           updated_at_epoch = ?,
           last_error = ?
     WHERE id = ?
  `).run(now, errorMessage, jobId).changes;
}

export function markJobSkipped(
  db: Database,
  jobId: number,
  reason: string,
  overrideTimestampEpoch?: number
): number {
  const now = overrideTimestampEpoch ?? Date.now();
  return db.prepare(`
    UPDATE observation_reconcile_jobs
       SET status = 'skipped',
           updated_at_epoch = ?,
           completed_at_epoch = ?,
           last_error = ?
     WHERE id = ?
  `).run(now, now, reason, jobId).changes;
}

export interface ListReconcileJobsOptions {
  status?: ObservationReconcileJobStatus | ObservationReconcileJobStatus[];
  project?: string;
  limit?: number;
}

export function listReconcileJobs(
  db: Database,
  options: ListReconcileJobsOptions = {}
): ObservationReconcileJobRow[] {
  const clauses: string[] = [];
  const params: string[] = [];

  if (options.status !== undefined) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    if (statuses.length > 0) {
      clauses.push(`status IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }
  }

  if (options.project !== undefined) {
    clauses.push('project = ?');
    params.push(options.project);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limitSql = options.limit && options.limit > 0 ? `LIMIT ${Math.floor(options.limit)}` : '';

  const sql = `
    SELECT * FROM observation_reconcile_jobs
    ${whereSql}
    ORDER BY created_at_epoch DESC, id DESC
    ${limitSql}
  `.trim();

  return db.prepare(sql).all(...params) as ObservationReconcileJobRow[];
}

export function getJobByObservationId(
  db: Database,
  observationId: number
): ObservationReconcileJobRow | null {
  return db.prepare(
    'SELECT * FROM observation_reconcile_jobs WHERE observation_id = ?'
  ).get(observationId) as ObservationReconcileJobRow | null;
}

export function countJobsByStatus(
  db: Database,
  status: ObservationReconcileJobStatus
): number {
  const row = db.prepare(
    'SELECT COUNT(*) AS count FROM observation_reconcile_jobs WHERE status = ?'
  ).get(status) as { count: number };
  return row.count;
}
