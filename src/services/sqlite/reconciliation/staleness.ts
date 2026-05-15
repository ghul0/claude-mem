import { Database } from 'bun:sqlite';
import { logger } from '../../../utils/logger.js';
import type { ReconciliationSettings } from './settings.js';

export interface MarkStaleInput {
  db: Database;
  project: string;
  filePath: string;
  fileMtimeMs: number;
  settings: ReconciliationSettings;
  overrideTimestampEpoch?: number;
}

export interface MarkStaleOutcome {
  candidatesScanned: number;
  markedStale: number;
  skippedReason: string | null;
}

interface CandidateRow {
  id: number;
  status: string | null;
  created_at_epoch: number;
  files_read: string | null;
  files_modified: string | null;
}

function parseStringArray(raw: string | null): string[] {
  if (raw === null || raw === '') return [];
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string');
    }
  } catch {
    return [];
  }
  return [];
}

export function markObservationsStaleByFile(input: MarkStaleInput): MarkStaleOutcome {
  if (!input.settings.enabled) {
    return { candidatesScanned: 0, markedStale: 0, skippedReason: 'reconciliation_disabled' };
  }
  if (!input.settings.apply) {
    return { candidatesScanned: 0, markedStale: 0, skippedReason: 'apply_disabled' };
  }
  if (!input.filePath || input.fileMtimeMs <= 0) {
    return { candidatesScanned: 0, markedStale: 0, skippedReason: 'invalid_input' };
  }

  const rows = input.db.prepare(`
    SELECT id, status, created_at_epoch, files_read, files_modified
    FROM observations
    WHERE (project = ? OR merged_into_project = ?)
      AND COALESCE(status, 'active') = 'active'
      AND created_at_epoch < ?
  `).all(input.project, input.project, input.fileMtimeMs) as CandidateRow[];

  const now = input.overrideTimestampEpoch ?? Date.now();
  let markedStale = 0;

  const updateStmt = input.db.prepare(`
    UPDATE observations
       SET status                  = 'stale',
           status_reason           = ?,
           status_updated_at_epoch = ?,
           reconciled_at_epoch     = ?
     WHERE id = ?
       AND COALESCE(status, 'active') = 'active'
  `);

  for (const row of rows) {
    const filesRead = parseStringArray(row.files_read);
    const filesModified = parseStringArray(row.files_modified);
    const matches =
      filesRead.includes(input.filePath) ||
      filesModified.includes(input.filePath);
    if (!matches) continue;
    const result = updateStmt.run(
      `File ${input.filePath} modified at ${input.fileMtimeMs} (after observation timestamp)`,
      now,
      now,
      row.id
    );
    if (result.changes > 0) markedStale += 1;
  }

  if (markedStale > 0) {
    logger.debug('RECONCILE', `Marked ${markedStale} observation(s) stale by file change`, {
      project: input.project,
      filePath: input.filePath,
      fileMtimeMs: input.fileMtimeMs,
      candidatesScanned: rows.length
    });
  }

  return { candidatesScanned: rows.length, markedStale, skippedReason: null };
}
