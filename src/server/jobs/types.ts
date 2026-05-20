// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import type {
  ObservationGenerationJobSourceType,
  ObservationGenerationJobStatus
} from '../../storage/postgres/generation-jobs.js';

export type ServerGenerationJobKind = 'event' | 'summary';

export type ServerGenerationJobStatus = ObservationGenerationJobStatus;

export interface ServerGenerationJob {
  kind: ServerGenerationJobKind;
  team_id: string;
  project_id: string;
  source_type: ObservationGenerationJobSourceType;
  source_id: string;
  generation_job_id: string;
  api_key_id: string | null;
  actor_id: string | null;
  source_adapter: string;
  request_id?: string | null;
}

export interface GenerateObservationsForEventJob extends ServerGenerationJob {
  kind: 'event';
  agent_event_id: string;
}

export interface GenerateSessionSummaryJob extends ServerGenerationJob {
  kind: 'summary';
  server_session_id: string;
}

export type ServerGenerationJobPayload =
  | GenerateObservationsForEventJob
  | GenerateSessionSummaryJob;

export const SERVER_JOB_QUEUE_NAMES: Record<ServerGenerationJobKind, string> = {
  event: 'server_beta_generate_event',
  summary: 'server_beta_generate_summary'
};

export const SERVER_JOB_KIND_PREFIX: Record<ServerGenerationJobKind, string> = {
  event: 'evt',
  summary: 'sum'
};

const baseFieldsSchema = z.object({
  team_id: z.string().min(1, 'team_id is required'),
  project_id: z.string().min(1, 'project_id is required'),
  source_type: z.enum(['agent_event', 'session_summary', 'observation_reindex']),
  source_id: z.string().min(1, 'source_id is required'),
  generation_job_id: z.string().min(1, 'generation_job_id is required'),
  api_key_id: z.string().min(1).nullable(),
  actor_id: z.string().min(1).nullable(),
  source_adapter: z.string().min(1, 'source_adapter is required'),
  request_id: z.string().min(1).nullable().optional(),
});

export const GenerateObservationsForEventJobSchema = baseFieldsSchema.extend({
  kind: z.literal('event'),
  agent_event_id: z.string().min(1),
});

export const GenerateSessionSummaryJobSchema = baseFieldsSchema.extend({
  kind: z.literal('summary'),
  server_session_id: z.string().min(1),
});

export const ServerGenerationJobPayloadSchema = z.discriminatedUnion('kind', [
  GenerateObservationsForEventJobSchema,
  GenerateSessionSummaryJobSchema,
]);

export class ServerGenerationJobPayloadValidationError extends Error {
  readonly issues: z.ZodIssue[];

  constructor(issues: z.ZodIssue[]) {
    super(`invalid server generation job payload: ${issues.map(i => i.message).join('; ')}`);
    this.issues = issues;
  }
}

export function assertServerGenerationJobPayload(
  candidate: unknown,
): ServerGenerationJobPayload {
  const result = ServerGenerationJobPayloadSchema.safeParse(candidate);
  if (!result.success) {
    throw new ServerGenerationJobPayloadValidationError(result.error.issues);
  }
  return result.data as ServerGenerationJobPayload;
}
