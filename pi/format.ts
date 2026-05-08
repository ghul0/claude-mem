export interface TextContent {
  type: "text";
  text: string;
}

export interface ToolResult {
  content: TextContent[];
  details?: unknown;
  isError?: boolean;
}

export const WORKER_UNAVAILABLE_MESSAGE = "claude-mem worker unavailable. Run: npx claude-mem repair";

export function textResult(text: string, details?: unknown, isError = false): ToolResult {
  return {
    content: [{ type: "text", text }],
    ...(details === undefined ? {} : { details }),
    ...(isError ? { isError: true } : {}),
  };
}

export function jsonText(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function isTextContent(value: unknown): value is TextContent {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "text" &&
    typeof (value as { text?: unknown }).text === "string",
  );
}

export function toolResultFromWorkerPayload(payload: unknown): ToolResult {
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { content?: unknown }).content) &&
    (payload as { content: unknown[] }).content.every(isTextContent)
  ) {
    return {
      content: (payload as { content: TextContent[] }).content,
      details: payload,
    };
  }

  return textResult(jsonText(payload), payload);
}

export function formatStatus(status: {
  ready: boolean;
  healthOk: boolean;
  readinessOk: boolean;
  port: number;
  baseUrl: string;
  dataDir: string;
  settingsPath: string;
  message?: string;
  start?: {
    attempted: boolean;
    ok: boolean;
    runtimePath?: string;
    scriptPath?: string;
    message?: string;
  };
}): string {
  const state = status.ready ? "ready" : status.healthOk ? "initializing" : "offline";
  return [
    `claude-mem worker: ${state}`,
    `url: ${status.baseUrl}`,
    `port: ${status.port}`,
    `dataDir: ${status.dataDir}`,
    `settings: ${status.settingsPath}`,
    `health: ${status.healthOk ? "ok" : "failed"}`,
    `readiness: ${status.readinessOk ? "ok" : "failed"}`,
    ...(status.message ? [`message: ${status.message}`] : []),
    ...(status.start ? [
      `start attempted: ${status.start.attempted ? "yes" : "no"}`,
      `start result: ${status.start.ok ? "ok" : "failed"}`,
      ...(status.start.runtimePath ? [`runtime: ${status.start.runtimePath}`] : []),
      ...(status.start.scriptPath ? [`script: ${status.start.scriptPath}`] : []),
      ...(status.start.message ? [`start message: ${status.start.message}`] : []),
    ] : []),
  ].join("\n");
}
