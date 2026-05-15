import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { MigrationRunner } from '../../src/services/sqlite/migrations/runner.js';
import {
  buildEvidenceBundle,
  persistReconciliationEvidenceAndJobs
} from '../../src/services/sqlite/reconciliation/evidence-builder.js';
import { getObservationEvidence } from '../../src/services/sqlite/reconciliation/evidence-store.js';
import { listReconcileJobs } from '../../src/services/sqlite/reconciliation/jobs-store.js';
import { storeObservation } from '../../src/services/sqlite/observations/store.js';

const FLAG_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED';

function seedSession(db: Database, memorySessionId: string, project: string): void {
  db.run(`
    INSERT INTO sdk_sessions (content_session_id, memory_session_id, project, started_at, started_at_epoch)
    VALUES ('csid-${memorySessionId}', '${memorySessionId}', '${project}', '2024-01-01T00:00:00Z', 1)
  `);
}

function seedObservation(db: Database, memorySessionId: string, project: string, title: string): number {
  const result = storeObservation(
    db,
    memorySessionId,
    project,
    {
      type: 'discovery',
      title,
      subtitle: null,
      facts: [],
      narrative: `narrative for ${title}`,
      concepts: [],
      files_read: ['/tmp/a.ts'],
      files_modified: []
    }
  );
  return result.id;
}

describe('buildEvidenceBundle', () => {
  it('strips <private>...</private> from user prompt and assistant message', () => {
    const bundle = buildEvidenceBundle({
      pendingMessageId: null,
      contentSessionId: 'csid',
      promptNumber: 1,
      project: 'proj',
      platformSource: 'claude',
      userPrompt: 'public part <private>SECRET KEY</private> tail',
      assistantMessage: '<private>internal note</private>cleaned',
      toolTrace: [],
      filesRead: [],
      filesModified: []
    });
    expect(bundle.userPrompt).toContain('public part');
    expect(bundle.userPrompt).toContain('tail');
    expect(bundle.userPrompt).not.toContain('SECRET KEY');
    expect(bundle.assistantMessage).not.toContain('internal note');
    expect(bundle.assistantMessage).toContain('cleaned');
  });

  it('truncates long user prompt with a marker', () => {
    const longPrompt = 'a'.repeat(10000);
    const bundle = buildEvidenceBundle({
      pendingMessageId: null,
      contentSessionId: null,
      promptNumber: null,
      project: 'p',
      platformSource: null,
      userPrompt: longPrompt,
      assistantMessage: null,
      toolTrace: [],
      filesRead: [],
      filesModified: []
    });
    expect(bundle.userPrompt!.length).toBeLessThan(longPrompt.length);
    expect(bundle.userPrompt).toContain('truncated');
    expect(bundle.truncated).toBe(true);
  });

  it('truncates large tool result text deterministically', () => {
    const bigResult = 'x'.repeat(60000);
    const bundle = buildEvidenceBundle({
      pendingMessageId: null,
      contentSessionId: null,
      promptNumber: null,
      project: 'p',
      platformSource: null,
      userPrompt: null,
      assistantMessage: null,
      toolTrace: [
        {
          toolUseId: 't1',
          toolName: 'read',
          toolInput: {},
          toolResultText: bigResult,
          toolResultDetails: null,
          isError: false,
          filesRead: [],
          filesModified: []
        }
      ],
      filesRead: [],
      filesModified: []
    });
    const entry = bundle.toolTrace[0];
    expect(entry.toolResultText!.length).toBeLessThan(bigResult.length);
    expect(entry.toolResultText).toContain('truncated');
    expect(entry.truncation?.truncated).toBe(true);
    expect(bundle.truncated).toBe(true);
  });
});

describe('persistReconciliationEvidenceAndJobs', () => {
  let db: Database;
  const originalEnabled = process.env[FLAG_KEY];

  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    new MigrationRunner(db).runAllMigrations();
    delete process.env[FLAG_KEY];
  });

  afterEach(() => {
    db.close();
    if (originalEnabled === undefined) {
      delete process.env[FLAG_KEY];
    } else {
      process.env[FLAG_KEY] = originalEnabled;
    }
  });

  it('does nothing when reconciliation is disabled', () => {
    seedSession(db, 'msid-disabled', 'proj-d');
    const obsId = seedObservation(db, 'msid-disabled', 'proj-d', 'A');
    const result = persistReconciliationEvidenceAndJobs({
      db,
      observations: [{ files_read: ['/x'], files_modified: [] }],
      observationIds: [obsId],
      insertedIds: [obsId],
      project: 'proj-d',
      contentSessionId: 'csid-msid-disabled',
      platformSource: 'claude',
      promptNumber: 1,
      userPrompt: 'do x',
      assistantMessage: 'did x'
    });
    expect(result.evidenceStored).toBe(0);
    expect(result.jobsEnqueued).toBe(0);
    expect(getObservationEvidence(db, obsId)).toBeNull();
    expect(listReconcileJobs(db).length).toBe(0);
  });

  it('stores evidence and enqueues a job per inserted observation when enabled', () => {
    process.env[FLAG_KEY] = 'true';
    seedSession(db, 'msid-enabled', 'proj-e');
    const obs1 = seedObservation(db, 'msid-enabled', 'proj-e', 'first');
    const obs2 = seedObservation(db, 'msid-enabled', 'proj-e', 'second');
    const result = persistReconciliationEvidenceAndJobs({
      db,
      observations: [
        { files_read: ['/a'], files_modified: ['/x'] },
        { files_read: ['/b'], files_modified: [] }
      ],
      observationIds: [obs1, obs2],
      insertedIds: [obs1, obs2],
      project: 'proj-e',
      contentSessionId: 'csid-msid-enabled',
      platformSource: 'claude',
      promptNumber: 5,
      userPrompt: 'compress this',
      assistantMessage: 'compressed'
    });
    expect(result.evidenceStored).toBe(2);
    expect(result.jobsEnqueued).toBe(2);
    expect(getObservationEvidence(db, obs1)?.project).toBe('proj-e');
    expect(getObservationEvidence(db, obs2)?.project).toBe('proj-e');
    expect(listReconcileJobs(db, { status: 'pending' }).length).toBe(2);
  });

  it('skips duplicate observations (in observationIds but not in insertedIds)', () => {
    process.env[FLAG_KEY] = 'true';
    seedSession(db, 'msid-dedup', 'proj-d2');
    const obsNew = seedObservation(db, 'msid-dedup', 'proj-d2', 'fresh');
    const obsExisting = seedObservation(db, 'msid-dedup', 'proj-d2', 'existing');
    const result = persistReconciliationEvidenceAndJobs({
      db,
      observations: [
        { files_read: [], files_modified: [] },
        { files_read: [], files_modified: [] }
      ],
      observationIds: [obsNew, obsExisting],
      insertedIds: [obsNew],
      project: 'proj-d2',
      contentSessionId: null,
      platformSource: null,
      promptNumber: null,
      userPrompt: null,
      assistantMessage: null
    });
    expect(result.evidenceStored).toBe(1);
    expect(result.jobsEnqueued).toBe(1);
    expect(getObservationEvidence(db, obsNew)).not.toBeNull();
    expect(getObservationEvidence(db, obsExisting)).toBeNull();
  });

  it('is a no-op when insertedIds is empty even with master flag on', () => {
    process.env[FLAG_KEY] = 'true';
    seedSession(db, 'msid-empty', 'proj-z');
    const obs = seedObservation(db, 'msid-empty', 'proj-z', 'x');
    const result = persistReconciliationEvidenceAndJobs({
      db,
      observations: [{ files_read: [], files_modified: [] }],
      observationIds: [obs],
      insertedIds: [],
      project: 'proj-z',
      contentSessionId: null,
      platformSource: null,
      promptNumber: null,
      userPrompt: null,
      assistantMessage: null
    });
    expect(result.evidenceStored).toBe(0);
    expect(result.jobsEnqueued).toBe(0);
  });
});

describe('storeObservation inserted flag', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    new MigrationRunner(db).runAllMigrations();
  });

  afterEach(() => {
    db.close();
  });

  it('returns inserted=true for a fresh observation and inserted=false for a duplicate content hash', () => {
    seedSession(db, 'msid-flag', 'proj-flag');

    const first = storeObservation(db, 'msid-flag', 'proj-flag', {
      type: 'discovery',
      title: 'unique-title',
      subtitle: null,
      facts: [],
      narrative: 'unique-narrative',
      concepts: [],
      files_read: [],
      files_modified: []
    });
    expect(first.inserted).toBe(true);

    const second = storeObservation(db, 'msid-flag', 'proj-flag', {
      type: 'discovery',
      title: 'unique-title',
      subtitle: null,
      facts: [],
      narrative: 'unique-narrative',
      concepts: [],
      files_read: [],
      files_modified: []
    });
    expect(second.inserted).toBe(false);
    expect(second.id).toBe(first.id);
  });
});
