import { Database } from 'bun:sqlite';

export interface RecordReconcileCostInput {
  jobId: number | null;
  observationId: number | null;
  project: string;
  role: 'selector' | 'classifier';
  model: string;
  inputTokens: number;
  outputTokens: number;
  usdCost: number;
  latencyMs: number | null;
}

export interface ObservationReconcileCostRow {
  id: number;
  job_id: number | null;
  observation_id: number | null;
  project: string;
  role: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  usd_cost: number;
  latency_ms: number | null;
  created_at: string;
  created_at_epoch: number;
}

export function recordReconcileCost(
  db: Database,
  input: RecordReconcileCostInput,
  overrideTimestampEpoch?: number
): number {
  const now = overrideTimestampEpoch ?? Date.now();
  const result = db.prepare(`
    INSERT INTO observation_reconcile_costs (
      job_id, observation_id, project, role, model,
      input_tokens, output_tokens, usd_cost, latency_ms,
      created_at, created_at_epoch
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.jobId,
    input.observationId,
    input.project,
    input.role,
    input.model,
    input.inputTokens,
    input.outputTokens,
    input.usdCost,
    input.latencyMs,
    new Date(now).toISOString(),
    now
  );
  return Number(result.lastInsertRowid);
}

export function getTotalCostSince(db: Database, sinceEpochMs: number): number {
  const row = db.prepare(`
    SELECT COALESCE(SUM(usd_cost), 0) AS total
    FROM observation_reconcile_costs
    WHERE created_at_epoch >= ?
  `).get(sinceEpochMs) as { total: number };
  return row.total;
}

export function getDailyCostUsd(db: Database, nowEpochMs: number = Date.now()): number {
  const dayMs = 24 * 60 * 60 * 1000;
  return getTotalCostSince(db, nowEpochMs - dayMs);
}

export interface ReconcileMetricsSummary {
  jobs: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    skipped: number;
  };
  relations: {
    total: number;
    byRelation: Record<string, number>;
  };
  statuses: Record<string, number>;
  cost: {
    last24hUsd: number;
    last24hCallCount: number;
  };
  killSwitch: boolean;
  dailyBudgetUsd: number;
}

export function buildReconcileMetricsSummary(
  db: Database,
  options: { killSwitch: boolean; dailyBudgetUsd: number; nowEpochMs?: number } = {
    killSwitch: false,
    dailyBudgetUsd: 0
  }
): ReconcileMetricsSummary {
  const nowMs = options.nowEpochMs ?? Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const jobRows = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM observation_reconcile_jobs
    GROUP BY status
  `).all() as Array<{ status: string; count: number }>;
  const jobs = { pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0 };
  for (const row of jobRows) {
    if (row.status in jobs) {
      (jobs as Record<string, number>)[row.status] = row.count;
    }
  }

  const relRows = db.prepare(`
    SELECT relation, COUNT(*) AS count
    FROM observation_relations
    GROUP BY relation
  `).all() as Array<{ relation: string; count: number }>;
  const byRelation: Record<string, number> = {};
  let totalRelations = 0;
  for (const row of relRows) {
    byRelation[row.relation] = row.count;
    totalRelations += row.count;
  }

  const statusRows = db.prepare(`
    SELECT COALESCE(status, 'active') AS status, COUNT(*) AS count
    FROM observations
    GROUP BY COALESCE(status, 'active')
  `).all() as Array<{ status: string; count: number }>;
  const statuses: Record<string, number> = {};
  for (const row of statusRows) {
    statuses[row.status] = row.count;
  }

  const cost24h = getTotalCostSince(db, nowMs - dayMs);
  const callRow = db.prepare(`
    SELECT COUNT(*) AS count FROM observation_reconcile_costs WHERE created_at_epoch >= ?
  `).get(nowMs - dayMs) as { count: number };

  return {
    jobs,
    relations: { total: totalRelations, byRelation },
    statuses,
    cost: { last24hUsd: cost24h, last24hCallCount: callRow.count },
    killSwitch: options.killSwitch,
    dailyBudgetUsd: options.dailyBudgetUsd
  };
}
