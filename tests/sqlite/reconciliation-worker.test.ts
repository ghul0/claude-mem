import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { MigrationRunner } from '../../src/services/sqlite/migrations/runner.js';
import { storeObservation } from '../../src/services/sqlite/observations/store.js';
import { enqueueReconcileJob, getJobByObservationId } from '../../src/services/sqlite/reconciliation/jobs-store.js';
import { ReconcileWorker } from '../../src/services/sqlite/reconciliation/reconciler-worker.js';
import { MockReconciliationLlmCaller } from '../../src/services/sqlite/reconciliation/llm-caller.js';
import { listRelationsBySource } from '../../src/services/sqlite/reconciliation/relations-store.js';

const FLAG_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED';
const MODEL_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_MODEL';

function seedSession(db: Database, memorySessionId: string, project: string): void {
  db.run(`
    INSERT INTO sdk_sessions (content_session_id, memory_session_id, project, started_at, started_at_epoch)
    VALUES ('csid-${memorySessionId}', '${memorySessionId}', '${project}', '2024-01-01T00:00:00Z', 1)
  `);
}

describe('ReconcileWorker.tick', () => {
  let db: Database;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    new MigrationRunner(db).runAllMigrations();
    saved[FLAG_KEY] = process.env[FLAG_KEY];
    saved[MODEL_KEY] = process.env[MODEL_KEY];
    delete process.env[FLAG_KEY];
    delete process.env[MODEL_KEY];
  });
  afterEach(() => {
    db.close();
    for (const k of [FLAG_KEY, MODEL_KEY]) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('does nothing when reconciliation is disabled', async () => {
    seedSession(db, 'msid-w1', 'proj-w1');
    const obs = storeObservation(db, 'msid-w1', 'proj-w1', {
      type: 'discovery',
      title: 'a',
      subtitle: null,
      facts: [],
      narrative: 'a',
      concepts: [],
      files_read: [],
      files_modified: []
    });
    enqueueReconcileJob(db, { observationId: obs.id, project: 'proj-w1' });

    const caller = new MockReconciliationLlmCaller(
      () => ({ candidateIds: [] }),
      () => ({ decisions: [] })
    );
    const worker = new ReconcileWorker(() => db, { caller });
    await worker.tick();

    const job = getJobByObservationId(db, obs.id);
    expect(job?.status).toBe('pending');
  });

  it('marks job skipped when no model is configured', async () => {
    process.env[FLAG_KEY] = 'true';
    seedSession(db, 'msid-w2', 'proj-w2');
    const obs = storeObservation(db, 'msid-w2', 'proj-w2', {
      type: 'discovery',
      title: 'a',
      subtitle: null,
      facts: [],
      narrative: 'a',
      concepts: [],
      files_read: [],
      files_modified: []
    });
    enqueueReconcileJob(db, { observationId: obs.id, project: 'proj-w2' });

    const worker = new ReconcileWorker(() => db);
    await worker.tick();

    const job = getJobByObservationId(db, obs.id);
    expect(job?.status).toBe('skipped');
    expect(job?.last_error).toBe('no_reconciliation_model_configured');
  });

  it('completes a job and records relations when caller returns decisions', async () => {
    process.env[FLAG_KEY] = 'true';
    process.env[MODEL_KEY] = 'mock-model';
    seedSession(db, 'msid-w3', 'proj-w3');
    const newObs = storeObservation(db, 'msid-w3', 'proj-w3', {
      type: 'feature',
      title: 'new architecture',
      subtitle: null,
      facts: [],
      narrative: 'replaced old pattern',
      concepts: ['arch'],
      files_read: ['/lib/a.ts'],
      files_modified: ['/lib/a.ts']
    });
    const oldObs = storeObservation(db, 'msid-w3', 'proj-w3', {
      type: 'feature',
      title: 'old architecture',
      subtitle: null,
      facts: [],
      narrative: 'original pattern',
      concepts: ['arch'],
      files_read: ['/lib/a.ts'],
      files_modified: []
    });
    enqueueReconcileJob(db, { observationId: newObs.id, project: 'proj-w3' });

    const caller = new MockReconciliationLlmCaller(
      () => ({ candidateIds: [oldObs.id] }),
      () => ({
        decisions: [
          {
            oldObservationId: oldObs.id,
            relation: 'supersedes',
            confidence: 0.92,
            evidence: '/lib/a.ts replaced architecture',
            reason: 'new replaces old',
            recommendedStatus: 'superseded'
          }
        ]
      })
    );
    const worker = new ReconcileWorker(() => db, { caller });
    await worker.tick();

    const job = getJobByObservationId(db, newObs.id);
    expect(job?.status).toBe('completed');
    const relations = listRelationsBySource(db, newObs.id);
    expect(relations.length).toBe(1);
    expect(relations[0].relation).toBe('supersedes');
  });

  it('marks job failed when caller throws', async () => {
    process.env[FLAG_KEY] = 'true';
    process.env[MODEL_KEY] = 'mock-model';
    seedSession(db, 'msid-w4', 'proj-w4');
    const obs = storeObservation(db, 'msid-w4', 'proj-w4', {
      type: 'discovery',
      title: 'a',
      subtitle: null,
      facts: [],
      narrative: 'a',
      concepts: [],
      files_read: ['/x'],
      files_modified: []
    });
    storeObservation(db, 'msid-w4', 'proj-w4', {
      type: 'discovery',
      title: 'b',
      subtitle: null,
      facts: [],
      narrative: 'b',
      concepts: [],
      files_read: ['/x'],
      files_modified: []
    });
    enqueueReconcileJob(db, { observationId: obs.id, project: 'proj-w4' });

    const caller = new MockReconciliationLlmCaller(
      () => { throw new Error('boom'); },
      () => ({ decisions: [] })
    );
    const worker = new ReconcileWorker(() => db, { caller });
    await worker.tick();

    const job = getJobByObservationId(db, obs.id);
    expect(job?.status).toBe('failed');
    expect(job?.last_error).toContain('boom');
  });
});
