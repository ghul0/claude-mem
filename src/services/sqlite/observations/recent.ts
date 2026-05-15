
import { Database } from 'bun:sqlite';
import { logger } from '../../../utils/logger.js';
import type { RecentObservationRow, AllRecentObservationRow } from './types.js';
import { buildStatusSqlClause } from '../reconciliation/status-filter.js';
import { parseStatusFilter } from '../reconciliation/status-filter.js';

export interface RecentObservationsOptions {
  status?: string;
}

export function getRecentObservations(
  db: Database,
  project: string,
  limit: number = 20,
  options: RecentObservationsOptions = {}
): RecentObservationRow[] {
  const filter = parseStatusFilter(options.status);
  if (filter.filterApplied) {
    const clause = buildStatusSqlClause(filter.statuses);
    const stmt = db.prepare(`
      SELECT type, text, prompt_number, created_at
      FROM observations
      WHERE project = ? AND ${clause.sql}
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `);
    return stmt.all(project, ...clause.params, limit) as RecentObservationRow[];
  }
  const stmt = db.prepare(`
    SELECT type, text, prompt_number, created_at
    FROM observations
    WHERE project = ?
    ORDER BY created_at_epoch DESC
    LIMIT ?
  `);

  return stmt.all(project, limit) as RecentObservationRow[];
}

export function getAllRecentObservations(
  db: Database,
  limit: number = 100,
  options: RecentObservationsOptions = {}
): AllRecentObservationRow[] {
  const filter = parseStatusFilter(options.status);
  if (filter.filterApplied) {
    const clause = buildStatusSqlClause(filter.statuses);
    const stmt = db.prepare(`
      SELECT id, type, title, subtitle, text, project, prompt_number, created_at, created_at_epoch
      FROM observations
      WHERE ${clause.sql}
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `);
    return stmt.all(...clause.params, limit) as AllRecentObservationRow[];
  }
  const stmt = db.prepare(`
    SELECT id, type, title, subtitle, text, project, prompt_number, created_at, created_at_epoch
    FROM observations
    ORDER BY created_at_epoch DESC
    LIMIT ?
  `);

  return stmt.all(limit) as AllRecentObservationRow[];
}

export function getFirstObservationCreatedAt(db: Database): string | null {
  const stmt = db.prepare(`
    SELECT created_at
    FROM observations
    ORDER BY created_at_epoch ASC
    LIMIT 1
  `);

  const row = stmt.get() as { created_at: string } | undefined;
  return row ? row.created_at : null;
}
