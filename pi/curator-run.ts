export interface CuratorToolCallSummary {
  name: string;
  args?: unknown;
  resultPreview?: string;
  isError?: boolean;
}

export interface CuratorRunSummary {
  id: number;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  status: "running" | "empty" | "injected" | "error" | "timeout";
  project: string;
  promptPreview: string;
  piSessionId?: string;
  systemPromptPath?: string;
  promptPath?: string;
  stdoutPath?: string;
  stderrPath?: string;
  donePath?: string;
  command?: string;
  systemPromptChars?: number;
  promptChars?: number;
  stdoutBytes?: number;
  stderrBytes?: number;
  observationIds: number[];
  contextChars: number;
  contextPreview?: string;
  reason?: string;
  error?: string;
  tools: CuratorToolCallSummary[];
}

let nextRunId = 1;
let currentRun: CuratorRunSummary | undefined;
const recentRuns: CuratorRunSummary[] = [];

function preview(text: string, max = 500): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized;
}

function cloneRun(run: CuratorRunSummary): CuratorRunSummary {
  return {
    ...run,
    observationIds: [...run.observationIds],
    tools: run.tools.map((tool) => ({ ...tool })),
  };
}

function remember(run: CuratorRunSummary): void {
  const index = recentRuns.findIndex((item) => item.id === run.id);
  const clone = cloneRun(run);
  if (index >= 0) recentRuns[index] = clone;
  else recentRuns.unshift(clone);
  recentRuns.splice(10);
}

export function startCuratorRun(project: string, prompt: string): CuratorRunSummary {
  const run: CuratorRunSummary = {
    id: nextRunId++,
    startedAt: new Date().toISOString(),
    status: "running",
    project,
    promptPreview: preview(prompt),
    observationIds: [],
    contextChars: 0,
    tools: [],
  };
  currentRun = run;
  remember(run);
  return run;
}

export function attachCuratorRunFiles(run: CuratorRunSummary, files: {
  systemPromptPath: string;
  promptPath: string;
  stdoutPath: string;
  stderrPath: string;
  donePath: string;
  command: string;
  systemPromptChars: number;
  promptChars: number;
}): void {
  Object.assign(run, files);
  remember(run);
}

export function finishCuratorRun(run: CuratorRunSummary, updates: Partial<CuratorRunSummary>): void {
  Object.assign(run, updates, {
    finishedAt: updates.finishedAt ?? new Date().toISOString(),
  });
  run.durationMs = new Date(run.finishedAt!).getTime() - new Date(run.startedAt).getTime();
  if (currentRun?.id === run.id) currentRun = undefined;
  remember(run);
}

export function getCurrentCuratorRun(): CuratorRunSummary | undefined {
  return currentRun ? cloneRun(currentRun) : undefined;
}

export function getRecentCuratorRuns(): CuratorRunSummary[] {
  return recentRuns.map(cloneRun);
}

export function formatCuratorRunSummary(run: CuratorRunSummary): string {
  const lines = [
    `curator run #${run.id}: ${run.status}`,
    `project: ${run.project}`,
    `started: ${run.startedAt}`,
    ...(run.finishedAt ? [`finished: ${run.finishedAt}`, `duration: ${run.durationMs ?? 0}ms`] : []),
    ...(run.reason ? [`reason: ${run.reason}`] : []),
    ...(run.error ? [`error: ${run.error}`] : []),
    `observations: ${run.observationIds.length ? run.observationIds.map((id) => `#${id}`).join(", ") : "none"}`,
    `context chars: ${run.contextChars}`,
    `tools: ${run.tools.length ? run.tools.map((tool) => tool.name).join(" -> ") : "none recorded"}`,
    ...(run.piSessionId ? [`pi session: ${run.piSessionId}`, `open: pi --session ${run.piSessionId}`, `picker: pi -r`] : []),
    ...(run.systemPromptPath ? [`system prompt: ${run.systemPromptPath}`] : []),
    ...(run.promptPath ? [`prompt: ${run.promptPath}`] : []),
    ...(run.stdoutPath ? [`stdout: ${run.stdoutPath}`] : []),
    ...(run.stderrPath ? [`stderr: ${run.stderrPath}`] : []),
    ...(run.donePath ? [`done: ${run.donePath}`] : []),
    ...(run.systemPromptChars !== undefined ? [`system prompt chars: ${run.systemPromptChars}`] : []),
    ...(run.promptChars !== undefined ? [`prompt chars: ${run.promptChars}`] : []),
    ...(run.stdoutBytes !== undefined ? [`stdout bytes: ${run.stdoutBytes}`] : []),
    ...(run.stderrBytes !== undefined ? [`stderr bytes: ${run.stderrBytes}`] : []),
    "",
    "prompt preview:",
    run.promptPreview || "(empty)",
  ];

  if (run.contextPreview) {
    lines.push("", "context preview:", run.contextPreview);
  }

  if (run.tools.length) {
    lines.push("", "tool trace:");
    for (const tool of run.tools) {
      lines.push(`- ${tool.name}${tool.isError ? " (error)" : ""}`);
      if (tool.resultPreview) lines.push(`  result: ${tool.resultPreview}`);
    }
  }

  if (run.command) {
    lines.push("", "command:", run.command);
  }

  return lines.join("\n");
}

export function formatCuratorRunsList(runs = getRecentCuratorRuns()): string {
  if (!runs.length) return "No curator sessions recorded in this Pi process.";
  return runs
    .map((run) => [
      `#${run.id} ${run.status} ${run.durationMs !== undefined ? `${run.durationMs}ms` : "running"}`,
      `session=${run.piSessionId ?? "none"}`,
      ...(run.piSessionId ? [`open=pi --session ${run.piSessionId}`] : []),
      `project=${run.project}`,
      `obs=${run.observationIds.length}`,
      `ctx=${run.contextChars}`,
      `tools=${run.tools.map((tool) => tool.name).join("->") || "none"}`,
      run.error ? `error=${run.error}` : undefined,
    ].filter(Boolean).join(" | "))
    .join("\n");
}
