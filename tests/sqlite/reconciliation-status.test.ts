import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { MigrationRunner } from '../../src/services/sqlite/migrations/runner.js';
import { storeObservation } from '../../src/services/sqlite/observations/store.js';
import {
  validateTerminalEvidence,
  isValidTerminalEvidence
} from '../../src/services/sqlite/reconciliation/status-validator.js';
import {
  applyClassifierDecisionToObservation
} from '../../src/services/sqlite/reconciliation/status-application.js';
import {
  parseStatusFilter,
  buildStatusSqlClause,
  StatusFilterError
} from '../../src/services/sqlite/reconciliation/status-filter.js';
import { loadReconciliationSettings } from '../../src/services/sqlite/reconciliation/settings.js';

const FLAG_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED';
const APPLY_KEY = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_APPLY';

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

function readStatus(db: Database, id: number): string {
  const r = db.prepare('SELECT status FROM observations WHERE id = ?').get(id) as { status: string } | null;
  return r?.status ?? 'active';
}

describe('validateTerminalEvidence', () => {
  it('rejects null/empty/whitespace evidence', () => {
    expect(validateTerminalEvidence(null, 40).valid).toBe(false);
    expect(validateTerminalEvidence('', 40).valid).toBe(false);
    expect(validateTerminalEvidence('   ', 40).valid).toBe(false);
  });

  it('rejects evidence below min char threshold', () => {
    const r = validateTerminalEvidence('short evidence with /file/path here', 100);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('evidence_too_short');
  });

  it('rejects placeholder evidence', () => {
    expect(validateTerminalEvidence('see above', 5).valid).toBe(false);
    expect(validateTerminalEvidence('same as above', 5).valid).toBe(false);
    expect(validateTerminalEvidence('n/a', 1).valid).toBe(false);
  });

  it('rejects evidence without a concrete source anchor', () => {
    const r = validateTerminalEvidence('this is a long sentence without any concrete reference at all but long', 40);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('evidence_lacks_anchor');
  });

  it('accepts evidence with a file path anchor', () => {
    expect(isValidTerminalEvidence('pi/curator.ts deleted and pi/capture.ts updated to inject directly', 40)).toBe(true);
  });

  it('accepts evidence with an observation ID anchor', () => {
    expect(isValidTerminalEvidence('Superseded by observation #15080 which replaces the prior architecture', 40)).toBe(true);
  });

  it('accepts evidence with a tool name anchor', () => {
    expect(isValidTerminalEvidence('the Bash command output confirmed that the worker no longer spawns curator subprocess', 40)).toBe(true);
  });

  it('accepts evidence with a quoted fragment anchor', () => {
    expect(isValidTerminalEvidence('User explicitly stated "remove the curator pipeline entirely" in latest prompt', 40)).toBe(true);
  });
});

describe('applyClassifierDecisionToObservation', () => {
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

  it('does not mutate status when apply flag is disabled', () => {
    process.env[FLAG_KEY] = 'true';
    seedSession(db, 'msid-sa1', 'proj-sa');
    const src = seedObs(db, 'msid-sa1', 'proj-sa', 'new');
    const tgt = seedObs(db, 'msid-sa1', 'proj-sa', 'old');
    const settings = loadReconciliationSettings();

    const outcome = applyClassifierDecisionToObservation({
      db,
      targetObservationId: tgt,
      sourceObservationId: src,
      relation: 'supersedes',
      confidence: 0.95,
      evidence: 'pi/curator.ts deleted and pi/capture.ts updated',
      reason: 'arch change',
      settings
    });
    expect(outcome.applied).toBe(false);
    expect(outcome.reasonNotApplied).toBe('apply_disabled');
    expect(readStatus(db, tgt)).toBe('active');
  });

  it('applies superseded for high-confidence supersedes with valid evidence', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-sa2', 'proj-sa');
    const src = seedObs(db, 'msid-sa2', 'proj-sa', 'new');
    const tgt = seedObs(db, 'msid-sa2', 'proj-sa', 'old');
    const settings = loadReconciliationSettings();

    const outcome = applyClassifierDecisionToObservation({
      db,
      targetObservationId: tgt,
      sourceObservationId: src,
      relation: 'supersedes',
      confidence: 0.95,
      evidence: 'pi/curator.ts deleted and pi/capture.ts now injects directly',
      reason: 'architecture replaced',
      settings
    });
    expect(outcome.applied).toBe(true);
    expect(outcome.newStatus).toBe('superseded');
    const row = db.prepare('SELECT status, superseded_by_observation_id FROM observations WHERE id = ?').get(tgt) as
      | { status: string; superseded_by_observation_id: number | null }
      | null;
    expect(row?.status).toBe('superseded');
    expect(row?.superseded_by_observation_id).toBe(src);
  });

  it('applies deprecated for high-confidence contradicts with valid evidence', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-sa3', 'proj-sa');
    const src = seedObs(db, 'msid-sa3', 'proj-sa', 'new');
    const tgt = seedObs(db, 'msid-sa3', 'proj-sa', 'old');
    const settings = loadReconciliationSettings();

    const outcome = applyClassifierDecisionToObservation({
      db,
      targetObservationId: tgt,
      sourceObservationId: src,
      relation: 'contradicts',
      confidence: 0.95,
      evidence: 'The Bash test output disproves the prior claim about /api/context behavior',
      reason: 'evidence contradicts',
      settings
    });
    expect(outcome.applied).toBe(true);
    expect(outcome.newStatus).toBe('deprecated');
  });

  it('falls back to weak when confidence high but evidence invalid', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-sa4', 'proj-sa');
    const src = seedObs(db, 'msid-sa4', 'proj-sa', 'new');
    const tgt = seedObs(db, 'msid-sa4', 'proj-sa', 'old');
    const settings = loadReconciliationSettings();

    const outcome = applyClassifierDecisionToObservation({
      db,
      targetObservationId: tgt,
      sourceObservationId: src,
      relation: 'supersedes',
      confidence: 0.95,
      evidence: 'see above',
      reason: 'apply check',
      settings
    });
    expect(outcome.applied).toBe(true);
    expect(outcome.newStatus).toBe('weak');
  });

  it('marks weak for medium confidence supersedes', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-sa5', 'proj-sa');
    const src = seedObs(db, 'msid-sa5', 'proj-sa', 'new');
    const tgt = seedObs(db, 'msid-sa5', 'proj-sa', 'old');
    const settings = loadReconciliationSettings();

    const outcome = applyClassifierDecisionToObservation({
      db,
      targetObservationId: tgt,
      sourceObservationId: src,
      relation: 'supersedes',
      confidence: 0.75,
      evidence: 'partial evidence /file/x mentioned',
      reason: 'medium-confidence supersedes',
      settings
    });
    expect(outcome.applied).toBe(true);
    expect(outcome.newStatus).toBe('weak');
  });

  it('does not mutate for confidence below min weak threshold', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-sa6', 'proj-sa');
    const src = seedObs(db, 'msid-sa6', 'proj-sa', 'new');
    const tgt = seedObs(db, 'msid-sa6', 'proj-sa', 'old');
    const settings = loadReconciliationSettings();

    const outcome = applyClassifierDecisionToObservation({
      db,
      targetObservationId: tgt,
      sourceObservationId: src,
      relation: 'supersedes',
      confidence: 0.4,
      evidence: 'weak signal but /file/y mentioned',
      reason: 'low conf',
      settings
    });
    expect(outcome.applied).toBe(false);
    expect(outcome.reasonNotApplied).toBe('below_min_weak_confidence');
  });

  it('does not mutate when relation is no_relation or confirms', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-sa7', 'proj-sa');
    const src = seedObs(db, 'msid-sa7', 'proj-sa', 'new');
    const tgt = seedObs(db, 'msid-sa7', 'proj-sa', 'old');
    const settings = loadReconciliationSettings();

    const o1 = applyClassifierDecisionToObservation({
      db, targetObservationId: tgt, sourceObservationId: src,
      relation: 'no_relation', confidence: 0.95,
      evidence: 'unrelated to /file/x',
      reason: 'no relation',
      settings
    });
    expect(o1.applied).toBe(false);
    expect(o1.reasonNotApplied).toBe('relation_has_no_status_effect');

    const o2 = applyClassifierDecisionToObservation({
      db, targetObservationId: tgt, sourceObservationId: src,
      relation: 'confirms', confidence: 0.95,
      evidence: 'reinforces /file/x prior fact',
      reason: 'confirms',
      settings
    });
    expect(o2.applied).toBe(false);
    expect(o2.reasonNotApplied).toBe('relation_has_no_status_effect');
  });

  it('does not mutate terminal statuses', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-sa8', 'proj-sa');
    const src = seedObs(db, 'msid-sa8', 'proj-sa', 'new');
    const tgt = seedObs(db, 'msid-sa8', 'proj-sa', 'old');
    db.prepare('UPDATE observations SET status = ? WHERE id = ?').run('deprecated', tgt);
    const settings = loadReconciliationSettings();

    const outcome = applyClassifierDecisionToObservation({
      db,
      targetObservationId: tgt,
      sourceObservationId: src,
      relation: 'supersedes',
      confidence: 0.95,
      evidence: 'pi/curator.ts deleted with absolute proof',
      reason: 'attempted',
      settings
    });
    expect(outcome.applied).toBe(false);
    expect(outcome.reasonNotApplied).toBe('target_in_terminal_status');
    expect(readStatus(db, tgt)).toBe('deprecated');
  });

  it('allows weak → superseded escalation for high-confidence supersedes', () => {
    process.env[FLAG_KEY] = 'true';
    process.env[APPLY_KEY] = 'true';
    seedSession(db, 'msid-sa9', 'proj-sa');
    const src = seedObs(db, 'msid-sa9', 'proj-sa', 'new');
    const tgt = seedObs(db, 'msid-sa9', 'proj-sa', 'old');
    db.prepare('UPDATE observations SET status = ? WHERE id = ?').run('weak', tgt);
    const settings = loadReconciliationSettings();

    const outcome = applyClassifierDecisionToObservation({
      db,
      targetObservationId: tgt,
      sourceObservationId: src,
      relation: 'supersedes',
      confidence: 0.95,
      evidence: 'pi/curator.ts removed and architecture replaced cleanly',
      reason: 'escalation',
      settings
    });
    expect(outcome.applied).toBe(true);
    expect(outcome.previousStatus).toBe('weak');
    expect(outcome.newStatus).toBe('superseded');
  });
});

describe('parseStatusFilter / buildStatusSqlClause', () => {
  it('returns all statuses with filterApplied=false when feature is disabled', () => {
    const f = parseStatusFilter(undefined, { featureEnabled: false });
    expect(f.filterApplied).toBe(false);
    expect(f.statuses.length).toBe(5);
  });

  it('defaults to active,weak,stale when enabled and no param', () => {
    const f = parseStatusFilter(undefined, { featureEnabled: true });
    expect(f.filterApplied).toBe(true);
    expect(f.statuses).toEqual(['active', 'weak', 'stale']);
  });

  it('parses a CSV status list', () => {
    const f = parseStatusFilter('superseded,deprecated', { featureEnabled: true });
    expect(f.statuses).toEqual(['superseded', 'deprecated']);
  });

  it('throws on unknown status', () => {
    expect(() => parseStatusFilter('foo,active', { featureEnabled: true })).toThrow(StatusFilterError);
  });

  it('builds SQL IN clause with COALESCE column expression', () => {
    const c = buildStatusSqlClause(['active', 'weak']);
    expect(c.sql).toContain("COALESCE(status, 'active')");
    expect(c.sql).toContain('IN (?,?)');
    expect(c.params).toEqual(['active', 'weak']);
  });

  it('returns sql=1=0 for empty status list', () => {
    const c = buildStatusSqlClause([]);
    expect(c.sql).toBe('1=0');
    expect(c.params).toEqual([]);
  });
});
