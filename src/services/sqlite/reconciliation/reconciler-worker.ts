import { Database } from 'bun:sqlite';
import { logger } from '../../../utils/logger.js';
import {
  claimNextReconcileJob,
  markJobCompleted,
  markJobFailed,
  markJobSkipped
} from './jobs-store.js';
import { processSingleReconcileJob } from './reconciler.js';
import { isReconciliationEnabled } from './settings.js';
import {
  NoopReconciliationLlmCaller,
  type ReconciliationLlmCaller
} from './llm-caller.js';

export interface ReconcileWorkerOptions {
  intervalMs?: number;
  caller?: ReconciliationLlmCaller;
}

export class ReconcileWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private caller: ReconciliationLlmCaller;
  private intervalMs: number;

  constructor(
    private getDb: () => Database | null,
    private options: ReconcileWorkerOptions = {}
  ) {
    this.caller = options.caller ?? new NoopReconciliationLlmCaller();
    this.intervalMs = options.intervalMs ?? 5000;
  }

  setCaller(caller: ReconciliationLlmCaller): void {
    this.caller = caller;
    logger.debug('RECONCILE', 'Reconcile worker caller updated');
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    logger.debug('RECONCILE', 'Reconcile worker loop started', { intervalMs: this.intervalMs });
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.debug('RECONCILE', 'Reconcile worker loop stopped');
    }
  }

  async tick(): Promise<void> {
    if (this.running) return;
    if (!isReconciliationEnabled()) return;
    const db = this.getDb();
    if (!db) return;
    this.running = true;
    try {
      const job = claimNextReconcileJob(db);
      if (!job) return;
      logger.debug('RECONCILE', `Claimed reconcile job ${job.id}`, {
        observationId: job.observation_id,
        project: job.project
      });
      try {
        const outcome = await processSingleReconcileJob(
          db,
          { observationId: job.observation_id, project: job.project },
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
    } finally {
      this.running = false;
    }
  }
}
