import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { MigrationRunner } from '../../src/services/sqlite/migrations/runner.js';

interface TableColumnInfo {
  name: string;
  type: string;
  dflt_value: unknown;
}

interface IndexInfo {
  name: string;
  unique: number;
}

interface SchemaVersion {
  version: number;
}

function getColumns(db: Database, table: string): TableColumnInfo[] {
  return db.prepare(`PRAGMA table_info(${table})`).all() as TableColumnInfo[];
}

function getIndexNames(db: Database, table: string): string[] {
  return (db.prepare(`PRAGMA index_list(${table})`).all() as IndexInfo[]).map(idx => idx.name);
}

function getSchemaVersions(db: Database): number[] {
  return (db.prepare('SELECT version FROM schema_versions ORDER BY version ASC').all() as SchemaVersion[]).map(r => r.version);
}

describe('Reconciliation schema (migration 35)', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
  });

  afterEach(() => {
    db.close();
  });

  it('adds lifecycle columns to observations after a full migration run', () => {
    new MigrationRunner(db).runAllMigrations();
    const cols = getColumns(db, 'observations').map(c => c.name);
    expect(cols).toContain('status');
    expect(cols).toContain('status_confidence');
    expect(cols).toContain('status_reason');
    expect(cols).toContain('status_updated_at_epoch');
    expect(cols).toContain('superseded_by_observation_id');
    expect(cols).toContain('reconciled_at_epoch');
  });

  it('defaults observation status to active for fresh rows', () => {
    new MigrationRunner(db).runAllMigrations();
    db.run(`
      INSERT INTO sdk_sessions (content_session_id, memory_session_id, project, started_at, started_at_epoch)
      VALUES ('csid-1', 'msid-1', 'proj-x', '2024-01-01T00:00:00Z', 1)
    `);
    db.run(`
      INSERT INTO observations (memory_session_id, project, type, created_at, created_at_epoch)
      VALUES ('msid-1', 'proj-x', 'discovery', '2024-01-01T00:00:00Z', 1)
    `);
    const row = db.prepare('SELECT status, status_confidence FROM observations LIMIT 1').get() as
      | { status: string; status_confidence: number }
      | null;
    expect(row).not.toBeNull();
    expect(row?.status).toBe('active');
    expect(row?.status_confidence).toBe(1.0);
  });

  it('creates observation_relations with unique (source,target,relation)', () => {
    new MigrationRunner(db).runAllMigrations();
    const indexes = getIndexNames(db, 'observation_relations');
    expect(indexes.some(n => n.includes('observation_relations'))).toBe(true);

    const tableSql = db.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='observation_relations'"
    ).get() as { sql: string } | null;
    expect(tableSql).not.toBeNull();
    expect(tableSql?.sql).toContain('UNIQUE(source_observation_id, target_observation_id, relation)');
  });

  it('creates observation_evidence keyed by observation_id', () => {
    new MigrationRunner(db).runAllMigrations();
    const cols = getColumns(db, 'observation_evidence').map(c => c.name);
    expect(cols).toContain('observation_id');
    expect(cols).toContain('tool_trace_json');
    expect(cols).toContain('truncated');
    expect(cols).toContain('project');
  });

  it('creates observation_reconcile_jobs with status CHECK constraint', () => {
    new MigrationRunner(db).runAllMigrations();
    const tableSql = db.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='observation_reconcile_jobs'"
    ).get() as { sql: string } | null;
    expect(tableSql).not.toBeNull();
    expect(tableSql?.sql).toContain("CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'skipped'))");
  });

  it('records schema version 35 in schema_versions', () => {
    new MigrationRunner(db).runAllMigrations();
    expect(getSchemaVersions(db)).toContain(35);
  });

  it('migration 35 is idempotent when run twice', () => {
    const runner = new MigrationRunner(db);
    runner.runAllMigrations();
    runner.runAllMigrations();
    const versions = getSchemaVersions(db);
    const count35 = versions.filter(v => v === 35).length;
    expect(count35).toBe(1);
    const cols = getColumns(db, 'observations').map(c => c.name);
    expect(cols.filter(n => n === 'status').length).toBe(1);
  });
});
