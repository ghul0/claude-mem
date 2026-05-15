import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { MigrationRunner } from '../../src/services/sqlite/migrations/runner.js';
import { storeObservation } from '../../src/services/sqlite/observations/store.js';
import {
  recordReconcileCost,
  getDailyCostUsd,
  getTotalCostSince,
  buildReconcileMetricsSummary
} from '../../src/services/sqlite/reconciliation/cost-store.js';
import {
  processSingleReconcileJob
} from '../../src/services/sqlite/reconciliation/reconciler.js';
import {
  MockReconciliationLlmCaller,
  NoopReconciliationLlmCaller
} from '../../src/services/sqlite/reconciliation/llm-caller.js';
import { upsertObservationRelation } from '../../src/services/sqlite/reconciliation/relations-store.js';
import { enqueueReconcileJob } from '../../src/services/sqlite/reconciliation/jobs-store.js';

const FLAG_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED';
const MODEL_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_MODEL';
const KILL_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_KILL_SWITCH';
const BUDGET_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_DAILY_BUDGET_USD';

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
    narrative: `narrative ${title}`,
    concepts: [],
    files_read: ['/src/x.ts'],
    files_modified: []
  }).id;
}

describe('migration 37 — observation_reconcile_costs', () => {
  let db: Database;
  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    new MigrationRunner(db).runAllMigrations();
  });
  afterEach(() => db.close());

  it('creates observation_reconcile_costs table', () => {
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='observation_reconcile_costs'"
    ).get();
    expect(row).not.toBeNull();
    const versions = db.prepare('SELECT version FROM schema_versions WHERE version = 37').all();
    expect(versions.length).toBe(1);
  });

  it('migration 37 is idempotent', () => {
    new MigrationRunner(db).runAllMigrations();
    const versions = db.prepare('SELECT version FROM schema_versions WHERE version = 37').all();
    expect(versions.length).toBe(1);
  });
});

describe('cost tracking helpers', () => {
  let db: Database;
  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    new MigrationRunner(db).runAllMigrations();
  });
  afterEach(() => db.close());

  it('records and aggregates costs', () => {
    recordReconcileCost(db, {
      jobId: 1, observationId: 100, project: 'proj-c',
      role: 'selector', model: 'm', inputTokens: 10, outputTokens: 5,
      usdCost: 0.005, latencyMs: 120
    });
    recordReconcileCost(db, {
      jobId: 1, observationId: 100, project: 'proj-c',
      role: 'classifier', model: 'm', inputTokens: 30, outputTokens: 15,
      usdCost: 0.020, latencyMs: 350
    });
    const total = getTotalCostSince(db, 0);
    expect(total).toBeCloseTo(0.025);
  });

  it('getDailyCostUsd only includes last-24h rows', () => {
    const now = Date.now();
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
    recordReconcileCost(
      db,
      { jobId: null, observationId: null, project: 'p', role: 'selector', model: 'm', inputTokens: 0, outputTokens: 0, usdCost: 1.0, latencyMs: null },
      twoDaysAgo
    );
    recordReconcileCost(
      db,
      { jobId: null, observationId: null, project: 'p', role: 'selector', model: 'm', inputTokens: 0, outputTokens: 0, usdCost: 0.5, latencyMs: null },
      now - 60 * 1000
    );
    const daily = getDailyCostUsd(db, now);
    expect(daily).toBeCloseTo(0.5);
  });
});

describe('buildReconcileMetricsSummary', () => {
  let db: Database;
  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    new MigrationRunner(db).runAllMigrations();
  });
  afterEach(() => db.close());

  it('returns aggregated counts for jobs, relations, statuses and costs', () => {
    seedSession(db, 'msid-m', 'proj-m');
    const a = seedObs(db, 'msid-m', 'proj-m', 'a');
    const b = seedObs(db, 'msid-m', 'proj-m', 'b');
    enqueueReconcileJob(db, { observationId: a, project: 'proj-m' });
    enqueueReconcileJob(db, { observationId: b, project: 'proj-m' });

    upsertObservationRelation(db, {
      sourceObservationId: a, targetObservationId: b,
      relation: 'supersedes', confidence: 0.95,
      evidence: '/src/x.ts modified extensively',
      reason: 'arch'
    });

    db.prepare('UPDATE observations SET status = ? WHERE id = ?').run('weak', a);
    db.prepare('UPDATE observations SET status = ? WHERE id = ?').run('superseded', b);

    recordReconcileCost(db, {
      jobId: 1, observationId: a, project: 'proj-m', role: 'classifier', model: 'm',
      inputTokens: 100, outputTokens: 50, usdCost: 0.02, latencyMs: 200
    });

    const m = buildReconcileMetricsSummary(db, { killSwitch: false, dailyBudgetUsd: 5 });
    expect(m.jobs.pending).toBe(2);
    expect(m.relations.total).toBe(1);
    expect(m.relations.byRelation['supersedes']).toBe(1);
    expect(m.statuses['weak']).toBe(1);
    expect(m.statuses['superseded']).toBe(1);
    expect(m.cost.last24hUsd).toBeCloseTo(0.02);
    expect(m.cost.last24hCallCount).toBe(1);
    expect(m.dailyBudgetUsd).toBe(5);
    expect(m.killSwitch).toBe(false);
  });
});

describe('reconciler observability gates', () => {
  let db: Database;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    db = new Database(':memory:');
    db.run('PRAGMA journal_mode = WAL');
    new MigrationRunner(db).runAllMigrations();
    for (const k of [FLAG_KEY, MODEL_KEY, KILL_KEY, BUDGET_KEY]) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    db.close();
    for (const k of [FLAG_KEY, MODEL_KEY, KILL_KEY, BUDGET_KEY]) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('skips with reason=kill_switch_active when KILL_SWITCH=true', async () => {
    process.env[FLAG_KEY] = 'true';
    process.env[MODEL_KEY] = 'm';
    process.env[KILL_KEY] = 'true';
    seedSession(db, 'msid-k', 'proj-k');
    const id = seedObs(db, 'msid-k', 'proj-k', 'a');
    seedObs(db, 'msid-k', 'proj-k', 'b');
    const outcome = await processSingleReconcileJob(
      db,
      { observationId: id, project: 'proj-k' },
      new NoopReconciliationLlmCaller()
    );
    expect(outcome.status).toBe('skipped');
    expect(outcome.reason).toBe('kill_switch_active');
  });

  it('skips with reason=daily_budget_exceeded when over budget', async () => {
    process.env[FLAG_KEY] = 'true';
    process.env[MODEL_KEY] = 'm';
    process.env[BUDGET_KEY] = '1.0';
    seedSession(db, 'msid-b', 'proj-b');
    const id = seedObs(db, 'msid-b', 'proj-b', 'a');
    seedObs(db, 'msid-b', 'proj-b', 'b');
    recordReconcileCost(db, {
      jobId: null, observationId: null, project: 'proj-b',
      role: 'classifier', model: 'm',
      inputTokens: 0, outputTokens: 0, usdCost: 1.5, latencyMs: null
    });

    const caller = new MockReconciliationLlmCaller(
      () => ({ candidateIds: [] }),
      () => ({ decisions: [] })
    );
    const outcome = await processSingleReconcileJob(
      db,
      { observationId: id, project: 'proj-b' },
      caller
    );
    expect(outcome.status).toBe('skipped');
    expect(outcome.reason).toBe('daily_budget_exceeded');
  });

  it('runs normally when budget is set but not exceeded', async () => {
    process.env[FLAG_KEY] = 'true';
    process.env[MODEL_KEY] = 'm';
    process.env[BUDGET_KEY] = '5.0';
    seedSession(db, 'msid-bn', 'proj-bn');
    const newId = seedObs(db, 'msid-bn', 'proj-bn', 'new');
    const oldId = seedObs(db, 'msid-bn', 'proj-bn', 'old');

    const caller = new MockReconciliationLlmCaller(
      () => ({ candidateIds: [oldId] }),
      () => ({ decisions: [] })
    );
    const outcome = await processSingleReconcileJob(
      db,
      { observationId: newId, project: 'proj-bn' },
      caller
    );
    expect(outcome.status).toBe('completed');
  });
});
