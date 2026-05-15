import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { MigrationRunner } from '../../src/services/sqlite/migrations/runner.js';
import { storeObservation } from '../../src/services/sqlite/observations/store.js';
import {
  loadProjectCandidateCatalogue,
  countNonTerminalProjectObservations,
  loadObservationForReconcile
} from '../../src/services/sqlite/reconciliation/catalogue.js';
import {
  scoreCandidatesDeterministically,
  unionCandidates,
  chunkCandidates
} from '../../src/services/sqlite/reconciliation/scoring.js';
import {
  processSingleReconcileJob
} from '../../src/services/sqlite/reconciliation/reconciler.js';
import { storeObservationEvidence } from '../../src/services/sqlite/reconciliation/evidence-store.js';
import {
  MockReconciliationLlmCaller,
  NoopReconciliationLlmCaller,
  type CandidateSelectorResponse,
  type RelationClassifierResponse
} from '../../src/services/sqlite/reconciliation/llm-caller.js';
import { listRelationsBySource } from '../../src/services/sqlite/reconciliation/relations-store.js';

const FLAG_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED';
const MODEL_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_MODEL';
const MAX_OBS_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_MAX_PROJECT_OBS';

const savedEnv: Record<string, string | undefined> = {};

function captureEnv() {
  for (const k of [FLAG_KEY, MODEL_KEY, MAX_OBS_KEY]) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
}
function restoreEnv() {
  for (const k of [FLAG_KEY, MODEL_KEY, MAX_OBS_KEY]) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
}

function seedSession(db: Database, memorySessionId: string, project: string): void {
  db.run(`
    INSERT INTO sdk_sessions (content_session_id, memory_session_id, project, started_at, started_at_epoch)
    VALUES ('csid-${memorySessionId}', '${memorySessionId}', '${project}', '2024-01-01T00:00:00Z', 1)
  `);
}

function seedObs(
  db: Database,
  memorySessionId: string,
  project: string,
  overrides: Partial<{
    title: string;
    narrative: string;
    concepts: string[];
    files_read: string[];
    files_modified: string[];
    type: string;
    timestampEpoch: number;
  }> = {}
): number {
  const r = storeObservation(
    db,
    memorySessionId,
    project,
    {
      type: overrides.type ?? 'discovery',
      title: overrides.title ?? 'title',
      subtitle: null,
      facts: [],
      narrative: overrides.narrative ?? 'narrative',
      concepts: overrides.concepts ?? [],
      files_read: overrides.files_read ?? [],
      files_modified: overrides.files_modified ?? []
    },
    undefined,
    0,
    overrides.timestampEpoch
  );
  return r.id;
}

function setObservationStatus(db: Database, id: number, status: string) {
  db.prepare('UPDATE observations SET status = ? WHERE id = ?').run(status, id);
}

describe('catalogue', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    new MigrationRunner(db).runAllMigrations();
  });
  afterEach(() => db.close());

  it('returns only non-terminal observations for the project, excluding self', () => {
    seedSession(db, 'msid-c1', 'proj-c');
    const a = seedObs(db, 'msid-c1', 'proj-c', { title: 'a' });
    const b = seedObs(db, 'msid-c1', 'proj-c', { title: 'b' });
    const c = seedObs(db, 'msid-c1', 'proj-c', { title: 'c' });
    const d = seedObs(db, 'msid-c1', 'proj-c', { title: 'd' });
    setObservationStatus(db, c, 'deprecated');
    setObservationStatus(db, d, 'superseded');

    const catalogue = loadProjectCandidateCatalogue(db, 'proj-c', a);
    const ids = catalogue.map(o => o.id);
    expect(ids).toContain(b);
    expect(ids).not.toContain(a);
    expect(ids).not.toContain(c);
    expect(ids).not.toContain(d);
  });

  it('counts non-terminal observations correctly', () => {
    seedSession(db, 'msid-c2', 'proj-cnt');
    const a = seedObs(db, 'msid-c2', 'proj-cnt', { title: 'a' });
    const b = seedObs(db, 'msid-c2', 'proj-cnt', { title: 'b' });
    const c = seedObs(db, 'msid-c2', 'proj-cnt', { title: 'c' });
    setObservationStatus(db, c, 'deprecated');

    expect(countNonTerminalProjectObservations(db, 'proj-cnt')).toBe(2);
    void a; void b;
  });

  it('loadObservationForReconcile retrieves the full row', () => {
    seedSession(db, 'msid-c3', 'proj-l');
    const id = seedObs(db, 'msid-c3', 'proj-l', { title: 't', narrative: 'n', concepts: ['x'], files_read: ['/f'] });
    const row = loadObservationForReconcile(db, id);
    expect(row).not.toBeNull();
    expect(row?.title).toBe('t');
    expect(row?.concepts).toEqual(['x']);
    expect(row?.files_read).toEqual(['/f']);
  });
});

describe('scoring', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    new MigrationRunner(db).runAllMigrations();
  });
  afterEach(() => db.close());

  it('ranks candidates by shared files, concepts, type, lexical overlap', () => {
    seedSession(db, 'msid-s', 'proj-s');
    const ts = Date.now();
    const newObsId = seedObs(db, 'msid-s', 'proj-s', {
      title: 'memory reconciliation',
      narrative: 'fact deprecation pipeline',
      concepts: ['reconciliation', 'pipeline'],
      files_read: ['/src/reconcile.ts'],
      type: 'feature',
      timestampEpoch: ts
    });
    const sharedFilesId = seedObs(db, 'msid-s', 'proj-s', {
      title: 'something else',
      narrative: 'unrelated',
      concepts: [],
      files_read: ['/src/reconcile.ts'],
      type: 'bugfix',
      timestampEpoch: ts - 10
    });
    const sharedTitleId = seedObs(db, 'msid-s', 'proj-s', {
      title: 'memory reconciliation overview',
      narrative: 'doc',
      concepts: [],
      files_read: [],
      type: 'docs',
      timestampEpoch: ts - 5
    });
    const unrelatedId = seedObs(db, 'msid-s', 'proj-s', {
      title: 'completely different',
      narrative: 'foo bar baz',
      concepts: [],
      files_read: [],
      type: 'misc',
      timestampEpoch: ts - 1
    });

    const newObservation = loadObservationForReconcile(db, newObsId)!;
    const candidates = loadProjectCandidateCatalogue(db, 'proj-s', newObsId);
    const scored = scoreCandidatesDeterministically({
      newObservation,
      candidates,
      recentLimit: 200,
      topCap: 10
    });
    const scoredIds = scored.map(s => s.observation.id);
    expect(scoredIds.indexOf(sharedFilesId)).toBeGreaterThanOrEqual(0);
    expect(scoredIds.indexOf(sharedTitleId)).toBeGreaterThanOrEqual(0);
    expect(scoredIds.indexOf(unrelatedId)).toBe(-1);
    expect(scored[0].score).toBeGreaterThanOrEqual(scored[scored.length - 1].score);
  });

  it('caps the result list at topCap', () => {
    seedSession(db, 'msid-cap', 'proj-cap');
    const newObsId = seedObs(db, 'msid-cap', 'proj-cap', {
      title: 'cap test',
      files_read: ['/cap.ts']
    });
    for (let i = 0; i < 20; i++) {
      seedObs(db, 'msid-cap', 'proj-cap', { title: `n-${i}`, files_read: ['/cap.ts'] });
    }
    const newObservation = loadObservationForReconcile(db, newObsId)!;
    const candidates = loadProjectCandidateCatalogue(db, 'proj-cap', newObsId);
    const scored = scoreCandidatesDeterministically({
      newObservation,
      candidates,
      topCap: 5
    });
    expect(scored.length).toBe(5);
  });

  it('unionCandidates merges deterministic + vector ids without duplicates', () => {
    const catalogue = new Map();
    [1, 2, 3, 4, 5].forEach(id => {
      catalogue.set(id, {
        id, title: `t${id}`, subtitle: null, narrative: null,
        facts: [], concepts: [], files_read: [], files_modified: [],
        type: 'discovery', status: 'active', created_at_epoch: id
      });
    });
    const deterministic = [
      { observation: catalogue.get(1)!, score: 5, signals: {} as never },
      { observation: catalogue.get(2)!, score: 4, signals: {} as never }
    ];
    const out = unionCandidates(deterministic, [2, 3, 5], 10, catalogue);
    expect(out.map(o => o.id)).toEqual([1, 2, 3, 5]);
  });

  it('chunkCandidates splits the list into fixed-size chunks', () => {
    expect(chunkCandidates([1, 2, 3, 4, 5], 2).length).toBe(3);
    expect(chunkCandidates([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    expect(chunkCandidates([], 2)).toEqual([]);
  });
});

describe('processSingleReconcileJob', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    new MigrationRunner(db).runAllMigrations();
    captureEnv();
  });
  afterEach(() => {
    db.close();
    restoreEnv();
  });

  it('skips when master flag is disabled', async () => {
    seedSession(db, 'msid-r1', 'proj-r1');
    const id = seedObs(db, 'msid-r1', 'proj-r1');
    const outcome = await processSingleReconcileJob(
      db,
      { observationId: id, project: 'proj-r1' },
      new NoopReconciliationLlmCaller()
    );
    expect(outcome.status).toBe('skipped');
    expect(outcome.reason).toBe('reconciliation_disabled');
  });

  it('skips with no_reconciliation_model_configured when model is empty', async () => {
    process.env[FLAG_KEY] = 'true';
    seedSession(db, 'msid-r2', 'proj-r2');
    const id = seedObs(db, 'msid-r2', 'proj-r2');
    const outcome = await processSingleReconcileJob(
      db,
      { observationId: id, project: 'proj-r2' },
      new NoopReconciliationLlmCaller()
    );
    expect(outcome.status).toBe('skipped');
    expect(outcome.reason).toBe('no_reconciliation_model_configured');
  });

  it('skips with project_observation_limit_exceeded when too many obs', async () => {
    process.env[FLAG_KEY] = 'true';
    process.env[MODEL_KEY] = 'mock-model';
    process.env[MAX_OBS_KEY] = '2';
    seedSession(db, 'msid-r3', 'proj-r3');
    const id1 = seedObs(db, 'msid-r3', 'proj-r3', { title: 'a' });
    seedObs(db, 'msid-r3', 'proj-r3', { title: 'b' });
    seedObs(db, 'msid-r3', 'proj-r3', { title: 'c' });
    const outcome = await processSingleReconcileJob(
      db,
      { observationId: id1, project: 'proj-r3' },
      new NoopReconciliationLlmCaller()
    );
    expect(outcome.status).toBe('skipped');
    expect(outcome.reason).toBe('project_observation_limit_exceeded');
  });

  it('runs end-to-end with mocked LLM and persists relation upserts', async () => {
    process.env[FLAG_KEY] = 'true';
    process.env[MODEL_KEY] = 'mock-model';
    seedSession(db, 'msid-r4', 'proj-r4');
    const newId = seedObs(db, 'msid-r4', 'proj-r4', {
      title: 'curator removed',
      narrative: 'pi/curator.ts deleted; capture.ts now injects directly',
      files_read: ['/pi/capture.ts'],
      files_modified: ['/pi/capture.ts']
    });
    const oldId = seedObs(db, 'msid-r4', 'proj-r4', {
      title: 'pi uses curator subprocess',
      narrative: 'curator runs as separate worker subprocess',
      files_read: ['/pi/capture.ts'],
      files_modified: ['/pi/curator.ts']
    });

    storeObservationEvidence(db, newId, {
      pendingMessageId: null,
      contentSessionId: 'csid-msid-r4',
      promptNumber: 1,
      project: 'proj-r4',
      platformSource: 'claude',
      userPrompt: 'remove curator',
      assistantMessage: 'deleted pi/curator.ts',
      toolTrace: [],
      filesRead: ['/pi/capture.ts'],
      filesModified: ['/pi/capture.ts'],
      truncated: false
    });

    const selectorImpl = (): CandidateSelectorResponse => ({ candidateIds: [oldId] });
    const classifierImpl = (): RelationClassifierResponse => ({
      decisions: [
        {
          oldObservationId: oldId,
          relation: 'supersedes',
          confidence: 0.95,
          evidence: 'pi/curator.ts was deleted; capture.ts now injects directly',
          reason: 'architecture replaced',
          recommendedStatus: 'superseded'
        }
      ]
    });
    const caller = new MockReconciliationLlmCaller(selectorImpl, classifierImpl);

    const outcome = await processSingleReconcileJob(
      db,
      { observationId: newId, project: 'proj-r4' },
      caller
    );
    expect(outcome.status).toBe('completed');
    expect(outcome.decisionsRecorded).toBe(1);

    const relations = listRelationsBySource(db, newId);
    expect(relations.length).toBe(1);
    expect(relations[0].target_observation_id).toBe(oldId);
    expect(relations[0].relation).toBe('supersedes');
    expect(relations[0].confidence).toBe(0.95);
    expect(relations[0].model).toBe('mock-model');
  });

  it('discards classifier decisions for observation IDs not in candidate pool', async () => {
    process.env[FLAG_KEY] = 'true';
    process.env[MODEL_KEY] = 'mock-model';
    seedSession(db, 'msid-r5', 'proj-r5');
    const newId = seedObs(db, 'msid-r5', 'proj-r5', {
      title: 'something',
      files_read: ['/x.ts']
    });
    const oldId = seedObs(db, 'msid-r5', 'proj-r5', {
      title: 'related',
      files_read: ['/x.ts']
    });

    const caller = new MockReconciliationLlmCaller(
      () => ({ candidateIds: [oldId] }),
      () => ({
        decisions: [
          {
            oldObservationId: 99999,
            relation: 'supersedes',
            confidence: 0.95,
            evidence: 'phantom',
            reason: 'phantom',
            recommendedStatus: null
          }
        ]
      })
    );
    const outcome = await processSingleReconcileJob(
      db,
      { observationId: newId, project: 'proj-r5' },
      caller
    );
    expect(outcome.status).toBe('completed');
    expect(outcome.decisionsRecorded).toBe(0);
    expect(listRelationsBySource(db, newId).length).toBe(0);
  });

  it('returns completed with zero decisions when classifier returns no_relation', async () => {
    process.env[FLAG_KEY] = 'true';
    process.env[MODEL_KEY] = 'mock-model';
    seedSession(db, 'msid-r6', 'proj-r6');
    const newId = seedObs(db, 'msid-r6', 'proj-r6', { title: 'unique', files_read: ['/q.ts'] });
    const oldId = seedObs(db, 'msid-r6', 'proj-r6', { title: 'old', files_read: ['/q.ts'] });
    const caller = new MockReconciliationLlmCaller(
      () => ({ candidateIds: [oldId] }),
      () => ({
        decisions: [
          {
            oldObservationId: oldId,
            relation: 'no_relation',
            confidence: 0.3,
            evidence: 'unrelated',
            reason: 'different scope',
            recommendedStatus: null
          }
        ]
      })
    );
    const outcome = await processSingleReconcileJob(
      db,
      { observationId: newId, project: 'proj-r6' },
      caller
    );
    expect(outcome.status).toBe('completed');
    expect(outcome.decisionsRecorded).toBe(1);
    const relations = listRelationsBySource(db, newId);
    expect(relations.length).toBe(1);
    expect(relations[0].relation).toBe('no_relation');
  });
});
