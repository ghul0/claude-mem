import { Database } from 'bun:sqlite';
import { logger } from '../../../utils/logger.js';
import {
  claimNextReconcileJob,
  markJobCompleted,
  markJobFailed,
  markJobSkipped,
  type EnqueueReconcileJobInput
} from './jobs-store.js';
import type { ObservationReconcileJobRow } from './types.js';
import { processSingleReconcileJob } from './reconciler.js';
import { isReconciliationEnabled } from './settings.js';
import {
  NoopReconciliationLlmCaller,
  type ReconciliationLlmCaller
} from './llm-caller.js';

export interface ReconcileWorkerOptions {
  intervalMs?: number;
  caller?: ReconciliationLlmCaller;
  concurrency?: number;
}

export class ReconcileWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight = 0;
  private activeJobs = new Set<Promise<void>>();
  private caller: ReconciliationLlmCaller;
  private intervalMs: number;
  private maxConcurrent: number;

  constructor(
    private getDb: () => Database | null,
    private options: ReconcileWorkerOptions = {}
  ) {
    this.caller = options.caller ?? new NoopReconciliationLlmCaller();
    this.intervalMs = options.intervalMs ?? 5000;
    this.maxConcurrent = Math.max(1, options.concurrency ?? 1);
  }

  setCaller(caller: ReconciliationLlmCaller): void {
    this.caller = caller;
    logger.debug('RECONCILE', 'Reconcile worker caller updated');
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick().catch((error: unknown) => {
        logger.error(
          'RECONCILE',
          'Scheduled reconcile tick failed',
          {},
          error instanceof Error ? error : new Error(String(error))
        );
      });
    }, this.intervalMs);
    logger.debug('RECONCILE', 'Reconcile worker loop started', {
      intervalMs: this.intervalMs,
      maxConcurrent: this.maxConcurrent
    });
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.debug('RECONCILE', 'Reconcile worker loop stopped');
    }
  }

  /**
   * Claims and dispatches available work, then returns without waiting for LLM
   * calls. This keeps the polling loop concurrent by design. Call waitForIdle()
   * only at explicit lifecycle/test barriers that must observe settled jobs.
   */
  async tick(): Promise<void> {
    if (!isReconciliationEnabled()) return;
    const db = this.getDb();
    if (!db) return;
    while (this.inFlight < this.maxConcurrent) {
      const job = claimNextReconcileJob(db);
      if (!job) return;
      this.inFlight += 1;
      const activeJob = this.processJob(db, job);
      this.activeJobs.add(activeJob);
      const finish = () => {
        this.activeJobs.delete(activeJob);
        this.inFlight -= 1;
      };
      void activeJob.then(finish, (error: unknown) => {
        finish();
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        logger.error(
          'RECONCILE',
          `Reconcile job ${job.id} escaped the job error boundary`,
          {},
          normalizedError
        );
      });
    }
  }

  async waitForIdle(): Promise<void> {
    while (this.activeJobs.size > 0) {
      await Promise.allSettled([...this.activeJobs]);
    }
  }

  private async processJob(db: Database, job: ObservationReconcileJobRow): Promise<void> {
    logger.debug('RECONCILE', `Claimed reconcile job ${job.id}`, {
      observationId: job.observation_id,
      project: job.project
    });
    try {
      const outcome = await processSingleReconcileJob(
        db,
        { observationId: job.observation_id, project: job.project } satisfies EnqueueReconcileJobInput,
        this.caller
      );
      if (outcome.status === 'skipped') {
        markJobSkipped(db, job.id, outcome.reason ?? 'unknown');
      } else {
        markJobCompleted(db, job.id);
      }
      logger.debug('RECONCILE', `Reconcile job ${job.id} ${outcome.status}`, {
        observationId: job.observation_id,
        decisionsRecorded: outcome.decisionsRecorded,
        candidatePoolSize: outcome.candidatePoolSize,
        reason: outcome.reason
      });
    } catch (error) {
      markJobFailed(db, job.id, error instanceof Error ? error.message : String(error));
      logger.warn(
        'RECONCILE',
        `Reconcile job ${job.id} failed`,
        { observationId: job.observation_id },
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
