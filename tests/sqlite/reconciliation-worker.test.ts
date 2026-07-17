import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { Database } from 'bun:sqlite';
import { MigrationRunner } from '../../src/services/sqlite/migrations/runner.js';
import { storeObservation } from '../../src/services/sqlite/observations/store.js';
import { enqueueReconcileJob, getJobByObservationId } from '../../src/services/sqlite/reconciliation/jobs-store.js';
import { ReconcileWorker } from '../../src/services/sqlite/reconciliation/reconciler-worker.js';
import {
  MockReconciliationLlmCaller,
  type ReconciliationLlmCaller,
} from '../../src/services/sqlite/reconciliation/llm-caller.js';
import { listRelationsBySource } from '../../src/services/sqlite/reconciliation/relations-store.js';
import { logger } from '../../src/utils/logger.js';

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
  let workers: ReconcileWorker[];
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    workers = [];
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    new MigrationRunner(db).runAllMigrations();
    saved[FLAG_KEY] = process.env[FLAG_KEY];
    saved[MODEL_KEY] = process.env[MODEL_KEY];
    delete process.env[FLAG_KEY];
    delete process.env[MODEL_KEY];
  });
  afterEach(async () => {
    workers.forEach((worker) => worker.stop());
    await Promise.all(workers.map((worker) => worker.waitForIdle()));
    db.close();
    for (const k of [FLAG_KEY, MODEL_KEY]) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  function createWorker(options: ConstructorParameters<typeof ReconcileWorker>[1] = {}): ReconcileWorker {
    const worker = new ReconcileWorker(() => db, options);
    workers.push(worker);
    return worker;
  }

  async function dispatchAndWait(worker: ReconcileWorker): Promise<void> {
    await worker.tick();
    await worker.waitForIdle();
  }

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
    const worker = createWorker({ caller });
    await dispatchAndWait(worker);

    const job = getJobByObservationId(db, obs.id);
    expect(job?.status).toBe('pending');
  });

  it('does not gate an enabled worker on the legacy model label', async () => {
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

    const worker = createWorker();
    await dispatchAndWait(worker);

    const job = getJobByObservationId(db, obs.id);
    expect(job?.status).toBe('completed');
    expect(job?.last_error).toBeNull();
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
    const worker = createWorker({ caller });
    await dispatchAndWait(worker);

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
    const worker = createWorker({ caller });
    await dispatchAndWait(worker);

    const job = getJobByObservationId(db, obs.id);
    expect(job?.status).toBe('failed');
    expect(job?.last_error).toContain('boom');
  });

  it('dispatches without awaiting LLM work and exposes an explicit idle barrier', async () => {
    process.env[FLAG_KEY] = 'true';
    seedSession(db, 'msid-w5', 'proj-w5');
    const newObs = storeObservation(db, 'msid-w5', 'proj-w5', {
      type: 'discovery',
      title: 'new',
      subtitle: null,
      facts: [],
      narrative: 'new',
      concepts: ['shared'],
      files_read: ['/shared'],
      files_modified: [],
    });
    storeObservation(db, 'msid-w5', 'proj-w5', {
      type: 'discovery',
      title: 'old',
      subtitle: null,
      facts: [],
      narrative: 'old',
      concepts: ['shared'],
      files_read: ['/shared'],
      files_modified: [],
    });
    enqueueReconcileJob(db, { observationId: newObs.id, project: 'proj-w5' });

    let releaseSelector!: () => void;
    const selectorGate = new Promise<void>((resolve) => { releaseSelector = resolve; });
    const caller: ReconciliationLlmCaller = {
      async selectCandidates() {
        await selectorGate;
        return { candidateIds: [] };
      },
      async classifyRelations() {
        return { decisions: [] };
      },
    };
    const worker = createWorker({ caller });

    await worker.tick();
    expect(getJobByObservationId(db, newObs.id)?.status).toBe('processing');

    let idle = false;
    const idleBarrier = worker.waitForIdle().then(() => { idle = true; });
    await Promise.resolve();
    expect(idle).toBe(false);

    releaseSelector();
    await idleBarrier;
    expect(getJobByObservationId(db, newObs.id)?.status).toBe('completed');
  });

  it('contains rejected scheduled ticks instead of leaking unhandled rejections', async () => {
    process.env[FLAG_KEY] = 'true';
    const expectedError = new Error('scheduled tick boom');
    let resolveLogged!: () => void;
    const logged = new Promise<void>((resolve) => { resolveLogged = resolve; });
    const errorSpy = spyOn(logger, 'error').mockImplementation((area, message) => {
      if (area === 'RECONCILE' && message === 'Scheduled reconcile tick failed') {
        resolveLogged();
      }
    });
    const worker = new ReconcileWorker(() => {
      throw expectedError;
    }, { intervalMs: 1 });
    workers.push(worker);

    try {
      worker.start();
      await Promise.race([
        logged,
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('scheduled tick error was not contained')), 250);
        }),
      ]);
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      worker.stop();
      errorSpy.mockRestore();
    }
  });
});
