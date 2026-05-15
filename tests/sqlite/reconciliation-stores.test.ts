import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { MigrationRunner } from '../../src/services/sqlite/migrations/runner.js';
import {
  storeObservationEvidence,
  getObservationEvidence,
  hasObservationEvidence,
  deleteObservationEvidence
} from '../../src/services/sqlite/reconciliation/evidence-store.js';
import {
  upsertObservationRelation,
  listRelationsBySource,
  listRelationsByTarget,
  getRelation
} from '../../src/services/sqlite/reconciliation/relations-store.js';
import {
  enqueueReconcileJob,
  claimNextReconcileJob,
  markJobCompleted,
  markJobFailed,
  markJobSkipped,
  listReconcileJobs,
  getJobByObservationId,
  countJobsByStatus
} from '../../src/services/sqlite/reconciliation/jobs-store.js';
import type { ObservationEvidenceBundle } from '../../src/services/sqlite/reconciliation/types.js';

function seedSessionAndObservation(db: Database, memorySessionId: string, project: string): number {
  db.run(`
    INSERT INTO sdk_sessions (content_session_id, memory_session_id, project, started_at, started_at_epoch)
    VALUES ('csid-${memorySessionId}', '${memorySessionId}', '${project}', '2024-01-01T00:00:00Z', 1)
  `);
  const inserted = db.prepare(`
    INSERT INTO observations (memory_session_id, project, type, title, narrative, created_at, created_at_epoch)
    VALUES (?, ?, 'discovery', ?, ?, '2024-01-01T00:00:00Z', ?)
    RETURNING id
  `).get(memorySessionId, project, `title-${memorySessionId}`, `narrative-${memorySessionId}`, Date.now()) as { id: number };
  return inserted.id;
}

function freshBundle(project: string): ObservationEvidenceBundle {
  return {
    pendingMessageId: 42,
    contentSessionId: 'csid-test',
    promptNumber: 3,
    project,
    platformSource: 'claude',
    userPrompt: 'do the thing',
    assistantMessage: 'doing the thing',
    toolTrace: [
      {
        toolUseId: 'tu1',
        toolName: 'read',
        toolInput: { file_path: '/tmp/x' },
        toolResultText: 'file contents',
        toolResultDetails: null,
        isError: false,
        filesRead: ['/tmp/x'],
        filesModified: []
      }
    ],
    filesRead: ['/tmp/x'],
    filesModified: [],
    truncated: false
  };
}

describe('Reconciliation stores', () => {
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

  describe('evidence-store', () => {
    it('stores and retrieves an evidence bundle by observation id', () => {
      const obsId = seedSessionAndObservation(db, 'msid-ev1', 'proj-a');
      storeObservationEvidence(db, obsId, freshBundle('proj-a'));
      expect(hasObservationEvidence(db, obsId)).toBe(true);
      const row = getObservationEvidence(db, obsId);
      expect(row).not.toBeNull();
      expect(row?.project).toBe('proj-a');
      expect(row?.tool_trace_json).toContain('"toolName":"read"');
      expect(row?.truncated).toBe(0);
    });

    it('upserts evidence on conflict by observation_id', () => {
      const obsId = seedSessionAndObservation(db, 'msid-ev2', 'proj-a');
      storeObservationEvidence(db, obsId, freshBundle('proj-a'));
      const updated = freshBundle('proj-b');
      updated.truncated = true;
      storeObservationEvidence(db, obsId, updated);
      const row = getObservationEvidence(db, obsId);
      expect(row?.project).toBe('proj-b');
      expect(row?.truncated).toBe(1);
    });

    it('deletes evidence row', () => {
      const obsId = seedSessionAndObservation(db, 'msid-ev3', 'proj-a');
      storeObservationEvidence(db, obsId, freshBundle('proj-a'));
      expect(deleteObservationEvidence(db, obsId)).toBe(1);
      expect(hasObservationEvidence(db, obsId)).toBe(false);
    });
  });

  describe('relations-store', () => {
    it('upserts relation and updates on conflict', () => {
      const src = seedSessionAndObservation(db, 'msid-rel-src', 'proj-r');
      const tgt = seedSessionAndObservation(db, 'msid-rel-tgt', 'proj-r');

      const first = upsertObservationRelation(db, {
        sourceObservationId: src,
        targetObservationId: tgt,
        relation: 'supersedes',
        confidence: 0.8,
        evidence: 'file deleted',
        reason: 'arch change',
        model: 'test-model'
      });
      expect(first.confidence).toBe(0.8);
      expect(first.updated_at_epoch).toBeNull();

      const second = upsertObservationRelation(db, {
        sourceObservationId: src,
        targetObservationId: tgt,
        relation: 'supersedes',
        confidence: 0.95,
        evidence: 'file deleted and replaced by Y',
        reason: 'better evidence',
        actionApplied: 'superseded',
        model: 'test-model-2'
      });
      expect(second.confidence).toBe(0.95);
      expect(second.evidence).toContain('replaced by Y');
      expect(second.action_applied).toBe('superseded');
      expect(second.model).toBe('test-model-2');
      expect(second.updated_at_epoch).not.toBeNull();

      const both = listRelationsBySource(db, src);
      expect(both.length).toBe(1);
      expect(listRelationsByTarget(db, tgt).length).toBe(1);
      expect(getRelation(db, src, tgt, 'supersedes')?.confidence).toBe(0.95);
    });

    it('allows different relation kinds for same (source, target)', () => {
      const src = seedSessionAndObservation(db, 'msid-rel2-src', 'proj-r2');
      const tgt = seedSessionAndObservation(db, 'msid-rel2-tgt', 'proj-r2');
      upsertObservationRelation(db, {
        sourceObservationId: src,
        targetObservationId: tgt,
        relation: 'weakens',
        confidence: 0.7,
        evidence: 'partial overlap',
        reason: 'narrower scope'
      });
      upsertObservationRelation(db, {
        sourceObservationId: src,
        targetObservationId: tgt,
        relation: 'confirms',
        confidence: 0.6,
        evidence: 'partial overlap',
        reason: 'still mostly true'
      });
      expect(listRelationsBySource(db, src).length).toBe(2);
    });
  });

  describe('jobs-store', () => {
    it('enqueues, claims, and completes a job', () => {
      const obsId = seedSessionAndObservation(db, 'msid-job1', 'proj-j');
      const enq = enqueueReconcileJob(db, { observationId: obsId, project: 'proj-j' });
      expect(enq.inserted).toBe(true);
      expect(countJobsByStatus(db, 'pending')).toBe(1);

      const claimed = claimNextReconcileJob(db);
      expect(claimed?.id).toBe(enq.jobId);
      expect(claimed?.status).toBe('processing');
      expect(claimed?.attempts).toBe(1);
      expect(claimed?.locked_at_epoch).not.toBeNull();

      expect(markJobCompleted(db, enq.jobId)).toBe(1);
      const job = getJobByObservationId(db, obsId);
      expect(job?.status).toBe('completed');
      expect(job?.completed_at_epoch).not.toBeNull();
      expect(job?.last_error).toBeNull();
    });

    it('does not duplicate jobs for the same observation', () => {
      const obsId = seedSessionAndObservation(db, 'msid-job2', 'proj-j');
      const first = enqueueReconcileJob(db, { observationId: obsId, project: 'proj-j' });
      const second = enqueueReconcileJob(db, { observationId: obsId, project: 'proj-j' });
      expect(second.inserted).toBe(false);
      expect(second.jobId).toBe(first.jobId);
      expect(countJobsByStatus(db, 'pending')).toBe(1);
    });

    it('marks job failed with last_error', () => {
      const obsId = seedSessionAndObservation(db, 'msid-job3', 'proj-j');
      const enq = enqueueReconcileJob(db, { observationId: obsId, project: 'proj-j' });
      claimNextReconcileJob(db);
      markJobFailed(db, enq.jobId, 'classifier_unreachable');
      const job = getJobByObservationId(db, obsId);
      expect(job?.status).toBe('failed');
      expect(job?.last_error).toBe('classifier_unreachable');
    });

    it('marks job skipped with reason', () => {
      const obsId = seedSessionAndObservation(db, 'msid-job4', 'proj-j');
      const enq = enqueueReconcileJob(db, { observationId: obsId, project: 'proj-j' });
      markJobSkipped(db, enq.jobId, 'project_observation_limit_exceeded');
      const job = getJobByObservationId(db, obsId);
      expect(job?.status).toBe('skipped');
      expect(job?.last_error).toBe('project_observation_limit_exceeded');
    });

    it('claim prefers pending and failed in FIFO order', () => {
      const obs1 = seedSessionAndObservation(db, 'msid-job5a', 'proj-j');
      const obs2 = seedSessionAndObservation(db, 'msid-job5b', 'proj-j');
      const enq1 = enqueueReconcileJob(db, { observationId: obs1, project: 'proj-j' }, 1000);
      const enq2 = enqueueReconcileJob(db, { observationId: obs2, project: 'proj-j' }, 2000);

      const c1 = claimNextReconcileJob(db);
      expect(c1?.id).toBe(enq1.jobId);
      const c2 = claimNextReconcileJob(db);
      expect(c2?.id).toBe(enq2.jobId);
      expect(claimNextReconcileJob(db)).toBeNull();
    });

    it('lists jobs filtered by status and project', () => {
      const o1 = seedSessionAndObservation(db, 'msid-job6a', 'proj-aa');
      const o2 = seedSessionAndObservation(db, 'msid-job6b', 'proj-bb');
      const j1 = enqueueReconcileJob(db, { observationId: o1, project: 'proj-aa' });
      const j2 = enqueueReconcileJob(db, { observationId: o2, project: 'proj-bb' });
      markJobCompleted(db, j1.jobId);

      expect(listReconcileJobs(db, { status: 'completed' }).length).toBe(1);
      expect(listReconcileJobs(db, { status: 'pending' }).length).toBe(1);
      expect(listReconcileJobs(db, { project: 'proj-bb' }).length).toBe(1);
      expect(listReconcileJobs(db, { project: 'proj-bb' })[0].id).toBe(j2.jobId);
      expect(listReconcileJobs(db, { limit: 1 }).length).toBe(1);
    });
  });
});
