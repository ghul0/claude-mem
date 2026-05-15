import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { MigrationRunner } from '../../src/services/sqlite/migrations/runner.js';
import { storeObservation } from '../../src/services/sqlite/observations/store.js';
import { markObservationsStaleByFile } from '../../src/services/sqlite/reconciliation/staleness.js';
import { loadReconciliationSettings } from '../../src/services/sqlite/reconciliation/settings.js';

const FLAG_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED';
const APPLY_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_APPLY';

function seedSession(db: Database, memorySessionId: string, project: string): void {
  db.run(`
    INSERT INTO sdk_sessions (content_session_id, memory_session_id, project, started_at, started_at_epoch)
    VALUES ('csid-${memorySessionId}', '${memorySessionId}', '${project}', '2024-01-01T00:00:00Z', 1)
  `);
}

let seedCounter = 0;
function seedObs(
  db: Database,
  memorySessionId: string,
  project: string,
  filesRead: string[],
  filesModified: string[],
  timestampEpoch: number,
  title?: string
): number {
  seedCounter += 1;
  const uniqueTitle = title ?? `obs-${seedCounter}`;
  return storeObservation(
    db,
    memorySessionId,
    project,
    {
      type: 'discovery',
      title: uniqueTitle,
      subtitle: null,
      facts: [],
      narrative: `narrative-${seedCounter}`,
      concepts: [],
      files_read: filesRead,
      files_modified: filesModified
    },
    undefined,
    0,
    timestampEpoch
  ).id;
}

function setStatus(db: Database, id: number, status: string): void {
  db.prepare('UPDATE observations SET status = ? WHERE id = ?').run(status, id);
}

function getStatus(db: Database, id: number): string {
  return (db.prepare('SELECT status FROM observations WHERE id = ?').get(id) as { status: string }).status;
}

describe('markObservationsStaleByFile', () => {
  let db: Database;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    new MigrationRunner(db).runAllMigrations();
    saved[FLAG_KEY] = process.env[FLAG_KEY];
    saved[APPLY_KEY] = process.env[APPLY_KEY];
    delete process.env[FLAG_KEY];
    delete process.env[APPLY_KEY];
  });
  afterEach(() => {
    db.close();
    for (const k of [FLAG_KEY, APPLY_KEY]) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('skips when feature flag is disabled', () => {
    seedSession(db, 'msid-s1', 'proj-s');
    const id = seedObs(db, 'msid-s1', 'proj-s', ['/src/a.ts'], [], 1000);
    const settings = loadReconciliationSettings();
    const result = markObservationsStaleByFile({
      db, project: 'proj-s', filePath: '/src/a.ts', fileMtimeMs: 5000, settings
    });
    expect(result.skippedReason).toBe('reconciliation_disabled');
    expect(getStatus(db, id)).toBe('active');
  });

  it('skips when apply flag is disabled (shadow mode)', () => {
    process.env[FLAG_KEY] = 'true';
    seedSession(db, 'msid-s2', 'proj-s');
    const id = seedObs(db, 'msid-s2', 'proj-s', ['/src/a.ts'], [], 1000);
    const settings = loadReconciliationSettings();
    const result = markObservationsStaleByFile({
      db, project: 'proj-s', filePath: '/src/a.ts', fileMtimeMs: 5000, settings
    });
    expect(result.skippedReason).toBe('apply_disabled');
    expect(getStatus(db, id)).toBe('active');
  });

  it('marks matching active observations stale when fileMtime is newer', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-s3', 'proj-s');
    const a = seedObs(db, 'msid-s3', 'proj-s', ['/src/a.ts'], [], 1000);
    const b = seedObs(db, 'msid-s3', 'proj-s', [], ['/src/a.ts'], 2000);
    const settings = loadReconciliationSettings();
    const result = markObservationsStaleByFile({
      db, project: 'proj-s', filePath: '/src/a.ts', fileMtimeMs: 5000, settings
    });
    expect(result.markedStale).toBe(2);
    expect(getStatus(db, a)).toBe('stale');
    expect(getStatus(db, b)).toBe('stale');
  });

  it('does not mark observations newer than the file mtime', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-s4', 'proj-s');
    const older = seedObs(db, 'msid-s4', 'proj-s', ['/src/a.ts'], [], 1000);
    const newer = seedObs(db, 'msid-s4', 'proj-s', ['/src/a.ts'], [], 6000);
    const settings = loadReconciliationSettings();
    markObservationsStaleByFile({
      db, project: 'proj-s', filePath: '/src/a.ts', fileMtimeMs: 5000, settings
    });
    expect(getStatus(db, older)).toBe('stale');
    expect(getStatus(db, newer)).toBe('active');
  });

  it('does not mark observations that do not reference the file', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-s5', 'proj-s');
    const matching = seedObs(db, 'msid-s5', 'proj-s', ['/src/a.ts'], [], 1000);
    const unrelated = seedObs(db, 'msid-s5', 'proj-s', ['/src/b.ts'], [], 1000);
    const settings = loadReconciliationSettings();
    markObservationsStaleByFile({
      db, project: 'proj-s', filePath: '/src/a.ts', fileMtimeMs: 5000, settings
    });
    expect(getStatus(db, matching)).toBe('stale');
    expect(getStatus(db, unrelated)).toBe('active');
  });

  it('does not escalate non-active statuses to stale', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-s6', 'proj-s');
    const weakId = seedObs(db, 'msid-s6', 'proj-s', ['/src/a.ts'], [], 1000, 'weak-obs');
    const supersededId = seedObs(db, 'msid-s6', 'proj-s', ['/src/a.ts'], [], 1000, 'sup-obs');
    const deprecatedId = seedObs(db, 'msid-s6', 'proj-s', ['/src/a.ts'], [], 1000, 'dep-obs');
    setStatus(db, weakId, 'weak');
    setStatus(db, supersededId, 'superseded');
    setStatus(db, deprecatedId, 'deprecated');
    const settings = loadReconciliationSettings();
    markObservationsStaleByFile({
      db, project: 'proj-s', filePath: '/src/a.ts', fileMtimeMs: 5000, settings
    });
    expect(getStatus(db, weakId)).toBe('weak');
    expect(getStatus(db, supersededId)).toBe('superseded');
    expect(getStatus(db, deprecatedId)).toBe('deprecated');
  });

  it('does not reactivate stale observations back to active when called again', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-s7', 'proj-s');
    const id = seedObs(db, 'msid-s7', 'proj-s', ['/src/a.ts'], [], 1000);
    setStatus(db, id, 'stale');
    const settings = loadReconciliationSettings();
    const result = markObservationsStaleByFile({
      db, project: 'proj-s', filePath: '/src/a.ts', fileMtimeMs: 5000, settings
    });
    expect(result.markedStale).toBe(0);
    expect(getStatus(db, id)).toBe('stale');
  });

  it('handles invalid input without crashing', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-s8', 'proj-s');
    const settings = loadReconciliationSettings();
    const result = markObservationsStaleByFile({
      db, project: 'proj-s', filePath: '', fileMtimeMs: 5000, settings
    });
    expect(result.skippedReason).toBe('invalid_input');
  });
});
