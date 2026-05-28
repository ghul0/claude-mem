import { Database } from 'bun:sqlite';
import type { ObservationRecord } from '../../../types/database.js';
import { DEFAULT_PLATFORM_SOURCE, normalizePlatformSource } from '../../../shared/platform-source.js';
import { logger } from '../../../utils/logger.js';
import type { GetObservationsByIdsOptions, ObservationSessionRow } from './types.js';
import { parseStatusFilter, buildStatusSqlClause } from '../reconciliation/status-filter.js';

export function getObservationById(db: Database, id: number): ObservationRecord | null {
  const stmt = db.prepare(`
    SELECT *
    FROM observations
    WHERE id = ?
  `);

  return stmt.get(id) as ObservationRecord | undefined || null;
}

export function getObservationsByIds(
  db: Database,
  ids: number[],
  options: GetObservationsByIdsOptions = {}
): ObservationRecord[] {
  if (ids.length === 0) return [];

  const { orderBy = 'date_desc', limit, project, type, concepts, files } = options;
  const preserveIdOrder = orderBy === 'relevance';
  const orderClause = preserveIdOrder
    ? ''
    : `ORDER BY created_at_epoch ${orderBy === 'date_asc' ? 'ASC' : 'DESC'}`;
  const limitClause = limit ? `LIMIT ${limit}` : '';

  const placeholders = ids.map(() => '?').join(',');
  const params: any[] = [...ids];
  const additionalConditions: string[] = [];

  if (project) {
    additionalConditions.push('project = ?');
    params.push(project);
  }

  if (type) {
    if (Array.isArray(type)) {
      const typePlaceholders = type.map(() => '?').join(',');
      additionalConditions.push(`type IN (${typePlaceholders})`);
      params.push(...type);
    } else {
      additionalConditions.push('type = ?');
      params.push(type);
    }
  }

  if (concepts) {
    const conceptsList = Array.isArray(concepts) ? concepts : [concepts];
    const conceptConditions = conceptsList.map(() =>
      'EXISTS (SELECT 1 FROM json_each(concepts) WHERE value = ?)'
    );
    params.push(...conceptsList);
    additionalConditions.push(`(${conceptConditions.join(' OR ')})`);
  }

  if (files) {
    const filesList = Array.isArray(files) ? files : [files];
    const fileConditions = filesList.map(() => {
      return '(EXISTS (SELECT 1 FROM json_each(files_read) WHERE value LIKE ?) OR EXISTS (SELECT 1 FROM json_each(files_modified) WHERE value LIKE ?))';
    });
    filesList.forEach(file => {
      params.push(`%${file}%`, `%${file}%`);
    });
    additionalConditions.push(`(${fileConditions.join(' OR ')})`);
  }

  const statusFilter = parseStatusFilter(undefined);
  if (statusFilter.filterApplied) {
    const clause = buildStatusSqlClause(statusFilter.statuses);
    additionalConditions.push(clause.sql);
    params.push(...clause.params);
  }

  const whereClause = additionalConditions.length > 0
    ? `WHERE id IN (${placeholders}) AND ${additionalConditions.join(' AND ')}`
    : `WHERE id IN (${placeholders})`;

  const stmt = db.prepare(`
    SELECT *
    FROM observations
    ${whereClause}
    ${orderClause}
    ${limitClause}
  `);

  const rows = stmt.all(...params) as ObservationRecord[];
  if (!preserveIdOrder) return rows;

  const rowMap = new Map(rows.map(r => [r.id, r]));
  return ids.map(id => rowMap.get(id)).filter((r): r is ObservationRecord => !!r);
}

export function getObservationsForSession(
  db: Database,
  memorySessionId: string
): ObservationSessionRow[] {
  const stmt = db.prepare(`
    SELECT title, subtitle, type, prompt_number
    FROM observations
    WHERE memory_session_id = ?
    ORDER BY created_at_epoch ASC
  `);

  return stmt.all(memorySessionId) as ObservationSessionRow[];
}

export function getObservationsByFilePath(
  db: Database,
  filePath: string | string[],
  options?: { projects?: string[]; limit?: number; platformSource?: string }
): ObservationRecord[] {
  const rawLimit = options?.limit;
  const limit = Number.isInteger(rawLimit) && (rawLimit as number) > 0
    ? Math.min(rawLimit as number, 100)
    : 15;

  // #2691 — PreToolUse:Read and PostToolUse can disagree on the stored path
  // form (absolute vs project-root-relative vs cwd-relative). Accept multiple
  // candidate path forms and match observations whose files_read/files_modified
  // contain ANY of them, so context injection keyed on path is consistent
  // across the two events. De-duplicate to keep the IN() clause minimal.
  const candidatePaths = Array.from(
    new Set((Array.isArray(filePath) ? filePath : [filePath]).filter(p => typeof p === 'string' && p.length > 0))
  );
  if (candidatePaths.length === 0) {
    logger.debug('DB', 'Skipping observation file lookup with no candidate paths');
    return [];
  }

  const pathPlaceholders = candidatePaths.map(() => '?').join(',');
  // Params order mirrors the two json_each subqueries (files_read, then files_modified).
  const params: (string | number)[] = [...candidatePaths, ...candidatePaths];

  let projectClause = '';
  if (options?.projects?.length) {
    const placeholders = options.projects.map(() => '?').join(',');
    projectClause = `AND o.project IN (${placeholders})`;
    params.push(...options.projects);
  }

  let platformClause = '';
  if (options?.platformSource) {
    platformClause = `AND COALESCE(NULLIF(s.platform_source, ''), '${DEFAULT_PLATFORM_SOURCE}') = ?`;
    params.push(normalizePlatformSource(options.platformSource));
  }

  let statusClause = '';
  const statusFilterFiles = parseStatusFilter(undefined);
  if (statusFilterFiles.filterApplied) {
    const clause = buildStatusSqlClause(statusFilterFiles.statuses);
    statusClause = `AND ${clause.sql}`;
    params.push(...clause.params);
  }

  params.push(limit);

  const stmt = db.prepare(`
    SELECT o.*
    FROM observations o
    LEFT JOIN sdk_sessions s ON s.memory_session_id = o.memory_session_id
    WHERE (
      (o.files_read LIKE '[%' AND EXISTS (SELECT 1 FROM json_each(o.files_read) WHERE value IN (${pathPlaceholders})))
      OR (o.files_modified LIKE '[%' AND EXISTS (SELECT 1 FROM json_each(o.files_modified) WHERE value IN (${pathPlaceholders})))
    )
    ${projectClause}
    ${platformClause}
    ${statusClause}
    ORDER BY created_at_epoch DESC
    LIMIT ?
  `);

  return stmt.all(...params) as ObservationRecord[];
}
