export type ObservationStatus = 'active' | 'weak' | 'stale' | 'superseded' | 'deprecated';

export const OBSERVATION_STATUSES: ObservationStatus[] = ['active', 'weak', 'stale', 'superseded', 'deprecated'];

export const TERMINAL_OBSERVATION_STATUSES: ObservationStatus[] = ['superseded', 'deprecated'];

export const NON_TERMINAL_OBSERVATION_STATUSES: ObservationStatus[] = ['active', 'weak', 'stale'];

export type ObservationRelationKind = 'supersedes' | 'contradicts' | 'weakens' | 'confirms' | 'no_relation';

export const OBSERVATION_RELATION_KINDS: ObservationRelationKind[] = [
  'supersedes',
  'contradicts',
  'weakens',
  'confirms',
  'no_relation'
];

export type ObservationReconcileJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface ObservationToolTraceEntry {
  toolUseId: string | null;
  toolName: string | null;
  toolInput: unknown;
  toolResultText: string | null;
  toolResultDetails: unknown;
  isError: boolean;
  filesRead: string[];
  filesModified: string[];
  truncation?: {
    truncated: boolean;
    originalBytes?: number;
    storedBytes?: number;
  };
}

export interface ObservationEvidenceBundle {
  pendingMessageId: number | null;
  contentSessionId: string | null;
  promptNumber: number | null;
  project: string;
  platformSource: string | null;
  userPrompt: string | null;
  assistantMessage: string | null;
  toolTrace: ObservationToolTraceEntry[];
  filesRead: string[];
  filesModified: string[];
  truncated: boolean;
}

export interface ObservationEvidenceRow {
  observation_id: number;
  pending_message_id: number | null;
  content_session_id: string | null;
  prompt_number: number | null;
  project: string;
  platform_source: string | null;
  user_prompt: string | null;
  assistant_message: string | null;
  tool_trace_json: string | null;
  files_read_json: string | null;
  files_modified_json: string | null;
  truncated: number;
  created_at: string;
  created_at_epoch: number;
}

export interface ObservationRelationInput {
  sourceObservationId: number;
  targetObservationId: number;
  relation: ObservationRelationKind;
  confidence: number;
  evidence: string;
  reason: string;
  actionApplied?: string | null;
  model?: string | null;
}

export interface ObservationRelationRow {
  id: number;
  source_observation_id: number;
  target_observation_id: number;
  relation: ObservationRelationKind;
  confidence: number;
  evidence: string;
  reason: string;
  action_applied: string | null;
  model: string | null;
  created_at: string;
  created_at_epoch: number;
  updated_at: string | null;
  updated_at_epoch: number | null;
}

export interface ObservationReconcileJobRow {
  id: number;
  observation_id: number;
  project: string;
  status: ObservationReconcileJobStatus;
  attempts: number;
  last_error: string | null;
  created_at_epoch: number;
  updated_at_epoch: number;
  locked_at_epoch: number | null;
  completed_at_epoch: number | null;
}
