-- claude-mem SQLite schema
--
-- Authoritative shape of the database after all migrations through
-- runner.ts have been applied (current tip = migration 34). Fresh
-- databases boot directly into this shape; existing databases reach
-- it via the migration runner.
--
-- Source of truth: src/services/sqlite/migrations/runner.ts
-- Regenerated from the migration runner and current schema invariants.
--
-- Invariants enforced here (Plan 01):
--   * pending_messages.UNIQUE(content_session_id, tool_use_id) — replaces
--     in-memory pendingTools Map for ingestion pairing (Plan 03 also depends).
--   * pending_messages only needs pending/processing status for current
--     claim handling; worker_pid and stale-reset epoch columns are legacy.
--   * observations.UNIQUE(memory_session_id, content_hash) — replaces the
--     legacy dedup window; ON CONFLICT DO NOTHING absorbs duplicates.

CREATE TABLE IF NOT EXISTS schema_versions (
  id INTEGER PRIMARY KEY,
  version INTEGER UNIQUE NOT NULL,
  applied_at TEXT NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────
-- sdk_sessions: one row per Claude/Codex session observed by claude-mem.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sdk_sessions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  content_session_id  TEXT    UNIQUE NOT NULL,
  memory_session_id   TEXT    UNIQUE,
  project             TEXT    NOT NULL,
  platform_source     TEXT    NOT NULL DEFAULT 'claude',
  user_prompt         TEXT,
  started_at          TEXT    NOT NULL,
  started_at_epoch    INTEGER NOT NULL,
  completed_at        TEXT,
  completed_at_epoch  INTEGER,
  status              TEXT    NOT NULL DEFAULT 'active'
                              CHECK(status IN ('active', 'completed', 'failed')),
  worker_port         INTEGER,
  prompt_counter      INTEGER DEFAULT 0,
  custom_title        TEXT
);
CREATE INDEX IF NOT EXISTS idx_sdk_sessions_claude_id        ON sdk_sessions(content_session_id);
CREATE INDEX IF NOT EXISTS idx_sdk_sessions_sdk_id           ON sdk_sessions(memory_session_id);
CREATE INDEX IF NOT EXISTS idx_sdk_sessions_project          ON sdk_sessions(project);
CREATE INDEX IF NOT EXISTS idx_sdk_sessions_status           ON sdk_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sdk_sessions_started          ON sdk_sessions(started_at_epoch DESC);
CREATE INDEX IF NOT EXISTS idx_sdk_sessions_platform_source  ON sdk_sessions(platform_source);

-- ─────────────────────────────────────────────────────────────────────
-- observations: structured memory rows extracted from SDK output.
-- UNIQUE(memory_session_id, content_hash) replaces the legacy dedup window;
-- writes use INSERT … ON CONFLICT DO NOTHING.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observations (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_session_id    TEXT    NOT NULL,
  project              TEXT    NOT NULL,
  text                 TEXT,
  type                 TEXT    NOT NULL,
  title                TEXT,
  subtitle             TEXT,
  facts                TEXT,
  narrative            TEXT,
  concepts             TEXT,
  files_read           TEXT,
  files_modified       TEXT,
  prompt_number        INTEGER,
  discovery_tokens     INTEGER DEFAULT 0,
  content_hash         TEXT,
  agent_type           TEXT,
  agent_id             TEXT,
  merged_into_project  TEXT,
  generated_by_model   TEXT,
  metadata             TEXT,
  status                       TEXT    DEFAULT 'active',
  status_confidence            REAL    DEFAULT 1.0,
  status_reason                TEXT,
  status_updated_at_epoch      INTEGER,
  superseded_by_observation_id INTEGER,
  reconciled_at_epoch          INTEGER,
  created_at           TEXT    NOT NULL,
  created_at_epoch     INTEGER NOT NULL,
  FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE(memory_session_id, content_hash)
);
CREATE INDEX IF NOT EXISTS idx_observations_sdk_session    ON observations(memory_session_id);
CREATE INDEX IF NOT EXISTS idx_observations_project        ON observations(project);
CREATE INDEX IF NOT EXISTS idx_observations_type           ON observations(type);
CREATE INDEX IF NOT EXISTS idx_observations_created        ON observations(created_at_epoch DESC);
CREATE INDEX IF NOT EXISTS idx_observations_content_hash   ON observations(content_hash, created_at_epoch);
CREATE INDEX IF NOT EXISTS idx_observations_agent_type     ON observations(agent_type);
CREATE INDEX IF NOT EXISTS idx_observations_agent_id       ON observations(agent_id);
CREATE INDEX IF NOT EXISTS idx_observations_merged_into    ON observations(merged_into_project);
CREATE INDEX IF NOT EXISTS idx_observations_status         ON observations(status);
CREATE INDEX IF NOT EXISTS idx_observations_project_status ON observations(project, status, created_at_epoch DESC);
CREATE INDEX IF NOT EXISTS idx_observations_superseded_by  ON observations(superseded_by_observation_id);

-- ─────────────────────────────────────────────────────────────────────
-- session_summaries: one summary row per memory session.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_summaries (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_session_id    TEXT    NOT NULL,
  project              TEXT    NOT NULL,
  request              TEXT,
  investigated         TEXT,
  learned              TEXT,
  completed            TEXT,
  next_steps           TEXT,
  files_read           TEXT,
  files_edited         TEXT,
  notes                TEXT,
  prompt_number        INTEGER,
  discovery_tokens     INTEGER DEFAULT 0,
  merged_into_project  TEXT,
  created_at           TEXT    NOT NULL,
  created_at_epoch     INTEGER NOT NULL,
  FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id)
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_session_summaries_sdk_session  ON session_summaries(memory_session_id);
CREATE INDEX IF NOT EXISTS idx_session_summaries_project      ON session_summaries(project);
CREATE INDEX IF NOT EXISTS idx_session_summaries_created      ON session_summaries(created_at_epoch DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_merged_into          ON session_summaries(merged_into_project);

-- ─────────────────────────────────────────────────────────────────────
-- pending_messages: persistent work queue for SDK messages.
-- UNIQUE(content_session_id, tool_use_id) preserves ingestion pairing without
-- any legacy worker_pid or stale-reset epoch column.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_messages (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  session_db_id            INTEGER NOT NULL,
  content_session_id       TEXT    NOT NULL,
  tool_use_id              TEXT,
  message_type             TEXT    NOT NULL
                                   CHECK(message_type IN ('observation', 'summarize')),
  tool_name                TEXT,
  tool_input               TEXT,
  tool_response            TEXT,
  cwd                      TEXT,
  last_user_message        TEXT,
  last_assistant_message   TEXT,
  prompt_number            INTEGER,
  status                   TEXT    NOT NULL DEFAULT 'pending'
                                   CHECK(status IN ('pending', 'processing')),
  created_at_epoch         INTEGER NOT NULL,
  agent_type               TEXT,
  agent_id                 TEXT,
  FOREIGN KEY (session_db_id) REFERENCES sdk_sessions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pending_messages_session        ON pending_messages(session_db_id);
CREATE INDEX IF NOT EXISTS idx_pending_messages_status         ON pending_messages(status);
CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_pending_session_tool
  ON pending_messages(content_session_id, tool_use_id)
  WHERE tool_use_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- user_prompts: per-prompt history (UI + FTS search).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_prompts (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  content_session_id TEXT    NOT NULL,
  prompt_number      INTEGER NOT NULL,
  prompt_text        TEXT    NOT NULL,
  created_at         TEXT    NOT NULL,
  created_at_epoch   INTEGER NOT NULL,
  FOREIGN KEY(content_session_id) REFERENCES sdk_sessions(content_session_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_prompts_claude_session ON user_prompts(content_session_id);
CREATE INDEX IF NOT EXISTS idx_user_prompts_created        ON user_prompts(created_at_epoch DESC);
CREATE INDEX IF NOT EXISTS idx_user_prompts_prompt_number  ON user_prompts(prompt_number);
CREATE INDEX IF NOT EXISTS idx_user_prompts_lookup         ON user_prompts(content_session_id, prompt_number);

-- ─────────────────────────────────────────────────────────────────────
-- observation_feedback: usage-signal tracking for tier routing.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observation_feedback (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  observation_id   INTEGER NOT NULL,
  signal_type      TEXT    NOT NULL,
  session_db_id    INTEGER,
  created_at_epoch INTEGER NOT NULL,
  metadata         TEXT,
  FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_feedback_observation ON observation_feedback(observation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_signal      ON observation_feedback(signal_type);

-- ─────────────────────────────────────────────────────────────────────
-- observation_relations: directed relations between observations
-- generated by the reconciliation worker (source = newer, target = older).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observation_relations (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  source_observation_id  INTEGER NOT NULL,
  target_observation_id  INTEGER NOT NULL,
  relation               TEXT    NOT NULL,
  confidence             REAL    NOT NULL,
  evidence               TEXT    NOT NULL,
  reason                 TEXT    NOT NULL,
  action_applied         TEXT,
  model                  TEXT,
  created_at             TEXT    NOT NULL,
  created_at_epoch       INTEGER NOT NULL,
  updated_at             TEXT,
  updated_at_epoch       INTEGER,
  FOREIGN KEY(source_observation_id) REFERENCES observations(id) ON DELETE CASCADE,
  FOREIGN KEY(target_observation_id) REFERENCES observations(id) ON DELETE CASCADE,
  UNIQUE(source_observation_id, target_observation_id, relation)
);
CREATE INDEX IF NOT EXISTS idx_observation_relations_source   ON observation_relations(source_observation_id);
CREATE INDEX IF NOT EXISTS idx_observation_relations_target   ON observation_relations(target_observation_id);
CREATE INDEX IF NOT EXISTS idx_observation_relations_relation ON observation_relations(relation);

-- ─────────────────────────────────────────────────────────────────────
-- observation_evidence: raw source bundle captured per inserted observation.
-- Used by the reconciler instead of inferring from compressed text alone.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observation_evidence (
  observation_id       INTEGER PRIMARY KEY,
  pending_message_id   INTEGER,
  content_session_id   TEXT,
  prompt_number        INTEGER,
  project              TEXT    NOT NULL,
  platform_source      TEXT,
  user_prompt          TEXT,
  assistant_message    TEXT,
  tool_trace_json      TEXT,
  files_read_json      TEXT,
  files_modified_json  TEXT,
  truncated            INTEGER DEFAULT 0,
  created_at           TEXT    NOT NULL,
  created_at_epoch     INTEGER NOT NULL,
  FOREIGN KEY(observation_id) REFERENCES observations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_observation_evidence_project ON observation_evidence(project);
CREATE INDEX IF NOT EXISTS idx_observation_evidence_created ON observation_evidence(created_at_epoch DESC);
CREATE INDEX IF NOT EXISTS idx_observation_evidence_pending ON observation_evidence(pending_message_id);

-- ─────────────────────────────────────────────────────────────────────
-- observation_reconcile_jobs: persistent async queue for reconciliation
-- work driven by the worker loop. One row per new inserted observation.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observation_reconcile_jobs (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  observation_id      INTEGER NOT NULL UNIQUE,
  project             TEXT    NOT NULL,
  status              TEXT    NOT NULL DEFAULT 'pending'
                              CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  attempts            INTEGER NOT NULL DEFAULT 0,
  last_error          TEXT,
  created_at_epoch    INTEGER NOT NULL,
  updated_at_epoch    INTEGER NOT NULL,
  locked_at_epoch     INTEGER,
  completed_at_epoch  INTEGER,
  FOREIGN KEY(observation_id) REFERENCES observations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_observation_reconcile_jobs_status         ON observation_reconcile_jobs(status, created_at_epoch);
CREATE INDEX IF NOT EXISTS idx_observation_reconcile_jobs_project_status ON observation_reconcile_jobs(project, status, created_at_epoch);

-- ─────────────────────────────────────────────────────────────────────
-- observation_status_audit: append-only audit trail for manual and
-- automatic observation status mutations.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observation_status_audit (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  observation_id         INTEGER NOT NULL,
  previous_status        TEXT,
  new_status             TEXT    NOT NULL,
  reason                 TEXT    NOT NULL,
  actor                  TEXT    NOT NULL,
  source_observation_id  INTEGER,
  created_at             TEXT    NOT NULL,
  created_at_epoch       INTEGER NOT NULL,
  FOREIGN KEY(observation_id) REFERENCES observations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_observation_status_audit_observation ON observation_status_audit(observation_id, created_at_epoch DESC);
CREATE INDEX IF NOT EXISTS idx_observation_status_audit_actor       ON observation_status_audit(actor);

-- ─────────────────────────────────────────────────────────────────────
-- observation_reconcile_costs: per-call cost/latency telemetry for
-- selector and classifier LLM invocations. Used by metrics endpoint
-- and DAILY_BUDGET_USD enforcement.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observation_reconcile_costs (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id             INTEGER,
  observation_id     INTEGER,
  project            TEXT    NOT NULL,
  role               TEXT    NOT NULL,
  model              TEXT    NOT NULL,
  input_tokens       INTEGER NOT NULL DEFAULT 0,
  output_tokens      INTEGER NOT NULL DEFAULT 0,
  usd_cost           REAL    NOT NULL DEFAULT 0.0,
  latency_ms         INTEGER,
  created_at         TEXT    NOT NULL,
  created_at_epoch   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_observation_reconcile_costs_job              ON observation_reconcile_costs(job_id);
CREATE INDEX IF NOT EXISTS idx_observation_reconcile_costs_created          ON observation_reconcile_costs(created_at_epoch DESC);
CREATE INDEX IF NOT EXISTS idx_observation_reconcile_costs_project_created  ON observation_reconcile_costs(project, created_at_epoch DESC);
