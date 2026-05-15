import { Database } from 'bun:sqlite';
import type { ObservationEvidenceBundle, ObservationEvidenceRow } from './types.js';

export function storeObservationEvidence(
  db: Database,
  observationId: number,
  bundle: ObservationEvidenceBundle,
  overrideTimestampEpoch?: number
): void {
  const now = overrideTimestampEpoch ?? Date.now();
  const nowIso = new Date(now).toISOString();
  db.prepare(`
    INSERT INTO observation_evidence (
      observation_id, pending_message_id, content_session_id, prompt_number,
      project, platform_source, user_prompt, assistant_message,
      tool_trace_json, files_read_json, files_modified_json, truncated,
      created_at, created_at_epoch
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(observation_id) DO UPDATE SET
      pending_message_id   = excluded.pending_message_id,
      content_session_id   = excluded.content_session_id,
      prompt_number        = excluded.prompt_number,
      project              = excluded.project,
      platform_source      = excluded.platform_source,
      user_prompt          = excluded.user_prompt,
      assistant_message    = excluded.assistant_message,
      tool_trace_json      = excluded.tool_trace_json,
      files_read_json      = excluded.files_read_json,
      files_modified_json  = excluded.files_modified_json,
      truncated            = excluded.truncated,
      created_at           = excluded.created_at,
      created_at_epoch     = excluded.created_at_epoch
  `).run(
    observationId,
    bundle.pendingMessageId,
    bundle.contentSessionId,
    bundle.promptNumber,
    bundle.project,
    bundle.platformSource,
    bundle.userPrompt,
    bundle.assistantMessage,
    JSON.stringify(bundle.toolTrace),
    JSON.stringify(bundle.filesRead),
    JSON.stringify(bundle.filesModified),
    bundle.truncated ? 1 : 0,
    nowIso,
    now
  );
}

export function getObservationEvidence(
  db: Database,
  observationId: number
): ObservationEvidenceRow | null {
  return db.prepare(
    'SELECT * FROM observation_evidence WHERE observation_id = ?'
  ).get(observationId) as ObservationEvidenceRow | null;
}

export function hasObservationEvidence(db: Database, observationId: number): boolean {
  const row = db.prepare(
    'SELECT 1 AS present FROM observation_evidence WHERE observation_id = ?'
  ).get(observationId) as { present: number } | null;
  return row !== null;
}

export function deleteObservationEvidence(db: Database, observationId: number): number {
  const result = db.prepare(
    'DELETE FROM observation_evidence WHERE observation_id = ?'
  ).run(observationId);
  return result.changes;
}
