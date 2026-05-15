import express, { Request, Response } from 'express';
import { z } from 'zod';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { validateBody } from '../middleware/validateBody.js';
import { logger } from '../../../../utils/logger.js';
import {
  listReconcileJobs,
  type ObservationReconcileJobStatus,
  OBSERVATION_RELATION_KINDS,
  OBSERVATION_STATUSES,
  applyManualStatusPatch,
  listStatusAudit,
  listRelationsBySource,
  buildReconcileMetricsSummary,
  isReconciliationKillSwitchActive,
  loadReconciliationSettings,
  type ObservationStatus
} from '../../../sqlite/reconciliation/index.js';
import type { DatabaseManager } from '../../DatabaseManager.js';

const ALLOWED_JOB_STATUSES = new Set<ObservationReconcileJobStatus>([
  'pending',
  'processing',
  'completed',
  'failed',
  'skipped'
]);

function parseStatusList(raw: string | undefined): ObservationReconcileJobStatus[] | undefined {
  if (raw === undefined || raw === '') return undefined;
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean) as ObservationReconcileJobStatus[];
  const invalid = parts.filter(p => !ALLOWED_JOB_STATUSES.has(p));
  if (invalid.length > 0) {
    throw new Error(`Unknown job status: ${invalid.join(',')}`);
  }
  return parts;
}

function parseLimit(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.floor(n), 500);
}

const patchStatusSchema = z.object({
  status: z.enum(OBSERVATION_STATUSES as [ObservationStatus, ...ObservationStatus[]]),
  reason: z.string().trim().min(3, 'reason must be at least 3 characters'),
  actor: z.string().trim().min(1).optional(),
  supersededByObservationId: z.number().int().positive().optional()
}).strict();

export class ReconciliationRoutes extends BaseRouteHandler {
  constructor(private dbManager: DatabaseManager) {
    super();
  }

  setupRoutes(app: express.Application): void {
    app.get('/api/observation-reconcile/jobs', this.handleListJobs.bind(this));
    app.get('/api/observation-reconcile/metrics', this.handleMetrics.bind(this));
    app.patch(
      '/api/observations/:id/status',
      validateBody(patchStatusSchema),
      this.handlePatchStatus.bind(this)
    );
    app.get('/api/observations/:id/relations', this.handleListRelations.bind(this));
    app.get('/api/observations/:id/status-audit', this.handleListStatusAudit.bind(this));
  }

  private handleMetrics = this.wrapHandler((_req: Request, res: Response): void => {
    const sessionStore = this.dbManager.getSessionStore();
    const settings = loadReconciliationSettings();
    const metrics = buildReconcileMetricsSummary(sessionStore.db, {
      killSwitch: isReconciliationKillSwitchActive(),
      dailyBudgetUsd: settings.dailyBudgetUsd
    });
    res.json({
      enabled: settings.enabled,
      apply: settings.apply,
      ...metrics
    });
  });

  private handleListJobs = this.wrapHandler((req: Request, res: Response): void => {
    const sessionStore = this.dbManager.getSessionStore();
    const db = sessionStore.db;

    let statuses: ObservationReconcileJobStatus[] | undefined;
    try {
      statuses = parseStatusList(typeof req.query.status === 'string' ? req.query.status : undefined);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : String(error),
        allowed: Array.from(ALLOWED_JOB_STATUSES)
      });
      return;
    }

    const project = typeof req.query.project === 'string' && req.query.project.trim()
      ? req.query.project.trim()
      : undefined;
    const limit = parseLimit(typeof req.query.limit === 'string' ? req.query.limit : undefined);

    const rows = listReconcileJobs(db, {
      status: statuses,
      project,
      limit
    });

    logger.debug('RECONCILE', `Listed ${rows.length} reconcile jobs`, {
      filterStatus: statuses?.join(','),
      filterProject: project,
      limit
    });

    res.json({
      jobs: rows,
      filter: {
        status: statuses ?? null,
        project: project ?? null,
        limit: limit ?? null
      },
      allowedStatuses: Array.from(ALLOWED_JOB_STATUSES),
      allowedRelations: OBSERVATION_RELATION_KINDS
    });
  });

  private handlePatchStatus = this.wrapHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: 'invalid observation id' });
      return;
    }
    const body = req.body as z.infer<typeof patchStatusSchema>;
    const sessionStore = this.dbManager.getSessionStore();
    const db = sessionStore.db;

    const result = applyManualStatusPatch(db, {
      observationId: id,
      newStatus: body.status,
      reason: body.reason,
      actor: body.actor ?? 'manual-api',
      supersededByObservationId: body.supersededByObservationId
    });

    if (!result.applied) {
      const status = result.error === 'observation_not_found' ? 404 : 400;
      res.status(status).json({ error: result.error ?? 'unknown_error' });
      return;
    }

    logger.info('RECONCILE', `Manual status patch applied to observation ${id}`, {
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
      actor: body.actor ?? 'manual-api'
    });

    res.json({
      success: true,
      observationId: id,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
      auditId: result.auditId
    });
  });

  private handleListRelations = this.wrapHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: 'invalid observation id' });
      return;
    }
    const sessionStore = this.dbManager.getSessionStore();
    const relations = listRelationsBySource(sessionStore.db, id);
    res.json({ observationId: id, relations });
  });

  private handleListStatusAudit = this.wrapHandler((req: Request, res: Response): void => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: 'invalid observation id' });
      return;
    }
    const sessionStore = this.dbManager.getSessionStore();
    const audit = listStatusAudit(sessionStore.db, id);
    res.json({ observationId: id, audit });
  });
}
