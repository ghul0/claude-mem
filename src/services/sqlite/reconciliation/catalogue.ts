import { Database } from 'bun:sqlite';

export interface CatalogueObservation {
  id: number;
  title: string | null;
  subtitle: string | null;
  narrative: string | null;
  facts: string[];
  concepts: string[];
  files_read: string[];
  files_modified: string[];
  type: string;
  status: string;
  created_at_epoch: number;
}

interface CatalogueRow {
  id: number;
  title: string | null;
  subtitle: string | null;
  narrative: string | null;
  facts: string | null;
  concepts: string | null;
  files_read: string | null;
  files_modified: string | null;
  type: string;
  status: string | null;
  created_at_epoch: number;
}

function parseStringArray(raw: string | null): string[] {
  if (raw === null || raw === '') return [];
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

function rowToCatalogueObservation(row: CatalogueRow): CatalogueObservation {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    narrative: row.narrative,
    facts: parseStringArray(row.facts),
    concepts: parseStringArray(row.concepts),
    files_read: parseStringArray(row.files_read),
    files_modified: parseStringArray(row.files_modified),
    type: row.type,
    status: row.status ?? 'active',
    created_at_epoch: row.created_at_epoch
  };
}

export function loadProjectCandidateCatalogue(
  db: Database,
  project: string,
  excludeObservationId: number
): CatalogueObservation[] {
  const rows = db.prepare(`
    SELECT id, title, subtitle, narrative, facts, concepts, files_read, files_modified, type, status, created_at_epoch
    FROM observations
    WHERE (project = ? OR merged_into_project = ?)
      AND id != ?
      AND COALESCE(status, 'active') IN ('active', 'weak', 'stale')
    ORDER BY created_at_epoch DESC
  `).all(project, project, excludeObservationId) as CatalogueRow[];
  return rows.map(rowToCatalogueObservation);
}

export function loadObservationForReconcile(
  db: Database,
  observationId: number
): CatalogueObservation | null {
  const row = db.prepare(`
    SELECT id, title, subtitle, narrative, facts, concepts, files_read, files_modified, type, status, created_at_epoch
    FROM observations
    WHERE id = ?
  `).get(observationId) as CatalogueRow | null;
  return row ? rowToCatalogueObservation(row) : null;
}

export function countNonTerminalProjectObservations(db: Database, project: string): number {
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM observations
    WHERE (project = ? OR merged_into_project = ?)
      AND COALESCE(status, 'active') IN ('active', 'weak', 'stale')
  `).get(project, project) as { count: number };
  return row.count;
}
