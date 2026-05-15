import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { MigrationRunner } from '../../src/services/sqlite/migrations/runner.js';
import { storeObservation } from '../../src/services/sqlite/observations/store.js';
import {
  applyManualStatusPatch
} from '../../src/services/sqlite/reconciliation/manual-status.js';
import { listStatusAudit } from '../../src/services/sqlite/reconciliation/audit-store.js';

function seedSession(db: Database, memorySessionId: string, project: string): void {
  db.run(`
    INSERT INTO sdk_sessions (content_session_id, memory_session_id, project, started_at, started_at_epoch)
    VALUES ('csid-${memorySessionId}', '${memorySessionId}', '${project}', '2024-01-01T00:00:00Z', 1)
  `);
}

function seedObs(db: Database, memorySessionId: string, project: string, title: string): number {
  return storeObservation(db, memorySessionId, project, {
    type: 'discovery',
    title,
    subtitle: null,
    facts: [],
    narrative: `narrative for ${title}`,
    concepts: [],
    files_read: [],
    files_modified: []
  }).id;
}

function getRow(db: Database, id: number) {
  return db.prepare('SELECT status, status_reason, superseded_by_observation_id FROM observations WHERE id = ?').get(id) as
    | { status: string; status_reason: string | null; superseded_by_observation_id: number | null }
    | null;
}

describe('migration 36 — observation_status_audit', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
  });
  afterEach(() => db.close());

  it('creates observation_status_audit table after migrations', () => {
    new MigrationRunner(db).runAllMigrations();
    const tableRow = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='observation_status_audit'"
    ).get();
    expect(tableRow).not.toBeNull();

    const versions = db.prepare('SELECT version FROM schema_versions ORDER BY version').all() as Array<{ version: number }>;
    expect(versions.some(v => v.version === 36)).toBe(true);
  });

  it('migration 36 is idempotent', () => {
    const runner = new MigrationRunner(db);
    runner.runAllMigrations();
    runner.runAllMigrations();
    const versions = db.prepare('SELECT version FROM schema_versions WHERE version = 36').all();
    expect(versions.length).toBe(1);
  });
});

describe('applyManualStatusPatch', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    new MigrationRunner(db).runAllMigrations();
  });
  afterEach(() => db.close());

  it('rejects invalid status', () => {
    seedSession(db, 'msid-m1', 'proj-m');
    const id = seedObs(db, 'msid-m1', 'proj-m', 'x');
    const r = applyManualStatusPatch(db, {
      observationId: id,
      newStatus: 'bogus' as never,
      reason: 'test',
      actor: 'tester'
    });
    expect(r.applied).toBe(false);
    expect(r.error).toBe('invalid_status');
  });

  it('rejects missing reason', () => {
    seedSession(db, 'msid-m2', 'proj-m');
    const id = seedObs(db, 'msid-m2', 'proj-m', 'x');
    const r = applyManualStatusPatch(db, {
      observationId: id,
      newStatus: 'deprecated',
      reason: '   ',
      actor: 'tester'
    });
    expect(r.applied).toBe(false);
    expect(r.error).toBe('missing_reason');
  });

  it('rejects missing actor', () => {
    seedSession(db, 'msid-m3', 'proj-m');
    const id = seedObs(db, 'msid-m3', 'proj-m', 'x');
    const r = applyManualStatusPatch(db, {
      observationId: id,
      newStatus: 'deprecated',
      reason: 'fix',
      actor: ''
    });
    expect(r.applied).toBe(false);
    expect(r.error).toBe('missing_actor');
  });

  it('reports observation_not_found for unknown id', () => {
    const r = applyManualStatusPatch(db, {
      observationId: 99999,
      newStatus: 'deprecated',
      reason: 'fix',
      actor: 'tester'
    });
    expect(r.applied).toBe(false);
    expect(r.error).toBe('observation_not_found');
  });

  it('updates observation and records audit row', () => {
    seedSession(db, 'msid-m4', 'proj-m');
    const id = seedObs(db, 'msid-m4', 'proj-m', 'x');
    const r = applyManualStatusPatch(db, {
      observationId: id,
      newStatus: 'deprecated',
      reason: 'manual correction: curator removed',
      actor: 'thomas'
    });
    expect(r.applied).toBe(true);
    expect(r.previousStatus).toBe('active');
    expect(r.newStatus).toBe('deprecated');
    expect(r.auditId).not.toBeNull();

    const row = getRow(db, id);
    expect(row?.status).toBe('deprecated');
    expect(row?.status_reason).toContain('curator removed');

    const audit = listStatusAudit(db, id);
    expect(audit.length).toBe(1);
    expect(audit[0].previous_status).toBe('active');
    expect(audit[0].new_status).toBe('deprecated');
    expect(audit[0].actor).toBe('thomas');
  });

  it('allows manual override of terminal statuses (deprecated → active)', () => {
    seedSession(db, 'msid-m5', 'proj-m');
    const id = seedObs(db, 'msid-m5', 'proj-m', 'x');
    db.prepare('UPDATE observations SET status = ? WHERE id = ?').run('deprecated', id);

    const r = applyManualStatusPatch(db, {
      observationId: id,
      newStatus: 'active',
      reason: 'reverting auto-deprecation; observation is still relevant',
      actor: 'thomas'
    });
    expect(r.applied).toBe(true);
    expect(r.previousStatus).toBe('deprecated');
    expect(r.newStatus).toBe('active');
    expect(getRow(db, id)?.status).toBe('active');
  });

  it('sets superseded_by when provided', () => {
    seedSession(db, 'msid-m6', 'proj-m');
    const a = seedObs(db, 'msid-m6', 'proj-m', 'a');
    const b = seedObs(db, 'msid-m6', 'proj-m', 'b');
    const r = applyManualStatusPatch(db, {
      observationId: a,
      newStatus: 'superseded',
      reason: 'manual mark superseded by b',
      actor: 'thomas',
      supersededByObservationId: b
    });
    expect(r.applied).toBe(true);
    expect(getRow(db, a)?.superseded_by_observation_id).toBe(b);
  });

  it('listStatusAudit returns rows newest-first', () => {
    seedSession(db, 'msid-m7', 'proj-m');
    const id = seedObs(db, 'msid-m7', 'proj-m', 'x');
    applyManualStatusPatch(db, {
      observationId: id, newStatus: 'weak', reason: 'first patch', actor: 'a',
      overrideTimestampEpoch: 1000
    });
    applyManualStatusPatch(db, {
      observationId: id, newStatus: 'deprecated', reason: 'second patch', actor: 'b',
      overrideTimestampEpoch: 2000
    });
    const audit = listStatusAudit(db, id);
    expect(audit.length).toBe(2);
    expect(audit[0].new_status).toBe('deprecated');
    expect(audit[1].new_status).toBe('weak');
  });
});
