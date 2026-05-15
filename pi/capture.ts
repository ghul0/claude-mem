import type {
  AgentMessage,
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionContext,
  TextContent,
  ToolResultEvent,
  ToolResultEventResult,
} from "@earendil-works/pi-coding-agent";
import { workerRequest } from "./client.js";
import { getProjectInfo } from "./project.js";
import { getContentSessionId, getLastAssistantText } from "./session.js";
import { isMemoryInjectionEnabled, updateMemoryStatus } from "./state.js";

const PLATFORM_SOURCE = "pi";
const PROJECT_CONTEXT_CUSTOM_TYPE = "claude-mem-project-context";

type ProjectContextMessage = NonNullable<BeforeAgentStartEventResult["message"]>;
type ProjectContextReason = "session-start" | "compact";

interface SessionInitResponse {
  sessionDbId?: number;
  promptNumber?: number;
  skipped?: boolean;
  reason?: string;
  contextInjected?: boolean;
}

function notifyDebug(ctx: ExtensionContext, message: string): void {
  if (!ctx.hasUI || process.env.CLAUDE_MEM_PI_DEBUG !== "true") return;
  ctx.ui.notify(message, "warning");
}

function isTextContent(value: unknown): value is TextContent {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "text" &&
    typeof (value as { text?: unknown }).text === "string",
  );
}

function textFromToolContent(content: ToolResultEvent["content"]): string {
  return content
    .filter(isTextContent)
    .map((part) => part.text)
    .join("\n");
}

function getReadPath(event: ToolResultEvent): string | undefined {
  if (event.toolName !== "read") return undefined;
  const input = event.input as Record<string, unknown>;
  const value = input.path ?? input.file_path ?? input.filePath;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function hasFreshProjectContext(ctx: ExtensionContext): boolean {
  let entries: unknown[] = [];
  try {
    entries = ctx.sessionManager.getBranch?.() ?? ctx.sessionManager.getEntries?.() ?? [];
  } catch {
    return false;
  }

  let seenAfterLatestCompact = false;
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    if (record.type === "compaction") {
      seenAfterLatestCompact = false;
      continue;
    }
    if (record.type === "custom_message" && record.customType === PROJECT_CONTEXT_CUSTOM_TYPE) {
      seenAfterLatestCompact = true;
    }
  }

  return seenAfterLatestCompact;
}

async function fetchProjectContext(projectRoot: string): Promise<string> {
  const context = await workerRequest<string>("/api/context/inject", {
    query: { project: projectRoot },
    timeoutMs: 15_000,
  });

  return typeof context === "string" ? context.trim() : "";
}

async function buildProjectContextMessage(
  ctx: ExtensionContext,
  reason: ProjectContextReason,
  details: Record<string, unknown> = {},
): Promise<ProjectContextMessage | undefined> {
  const project = getProjectInfo(ctx.cwd);
  const context = await fetchProjectContext(project.root);
  if (!context) return undefined;

  return {
    customType: PROJECT_CONTEXT_CUSTOM_TYPE,
    content: context,
    display: true,
    details: {
      contentSessionId: getContentSessionId(ctx),
      project: project.root,
      projectName: project.name,
      reason,
      ...details,
    },
  };
}

function formatFileObservations(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const observations = (payload as { observations?: unknown }).observations;
  if (!Array.isArray(observations) || observations.length === 0) return "";

  const lines = ["## claude-mem file context", "", "Past observations related to this file:", ""];
  for (const observation of observations.slice(0, 5)) {
    if (!observation || typeof observation !== "object") continue;
    const record = observation as Record<string, unknown>;
    const id = typeof record.id === "number" || typeof record.id === "string" ? `#${record.id}` : "";
    const title = typeof record.title === "string" && record.title.trim() ? record.title.trim() : "Observation";
    const date = typeof record.created_at === "string" ? record.created_at.slice(0, 10) : "";
    const narrative = typeof record.narrative === "string" ? record.narrative.trim() : "";
    lines.push(`- ${[id, title, date && `(${date})`].filter(Boolean).join(" ")}`);
    if (narrative) lines.push(`  ${narrative.replace(/\n+/g, " ").slice(0, 500)}`);
  }

  return lines.join("\n").trim();
}

async function getFileContext(event: ToolResultEvent, ctx: ExtensionContext, project: string): Promise<string> {
  const filePath = getReadPath(event);
  if (!filePath) return "";

  const payload = await workerRequest("/api/observations/by-file", {
    query: { path: filePath, projects: project, limit: 5 },
    timeoutMs: 5000,
  });

  return formatFileObservations(payload);
}

export async function handleBeforeAgentStart(
  event: BeforeAgentStartEvent,
  ctx: ExtensionContext,
): Promise<BeforeAgentStartEventResult | undefined> {
  try {
    const contentSessionId = getContentSessionId(ctx);
    const project = getProjectInfo(ctx.cwd);
    const prompt = event.prompt?.trim() ? event.prompt : "[media prompt]";

    const init = await workerRequest<SessionInitResponse>("/api/sessions/init", {
      method: "POST",
      body: JSON.stringify({
        contentSessionId,
        project: project.root,
        prompt,
        platformSource: PLATFORM_SOURCE,
      }),
      timeoutMs: 15_000,
    });

    if (init?.skipped || !isMemoryInjectionEnabled() || hasFreshProjectContext(ctx)) return undefined;

    if (ctx.hasUI) {
      ctx.ui.setStatus("claude-mem-context", ctx.ui.theme.fg("warning", "mem: loading project facts"));
      ctx.ui.setWorkingMessage("claude-mem: loading project memory context…");
      ctx.ui.setWorkingVisible(true);
    }

    try {
      const message = await buildProjectContextMessage(ctx, "session-start", {
        promptNumber: init?.promptNumber,
        sessionDbId: init?.sessionDbId,
      });
      return message ? { message } : undefined;
    } finally {
      if (ctx.hasUI) {
        ctx.ui.setStatus("claude-mem-context", undefined);
        ctx.ui.setWorkingMessage();
      }
      updateMemoryStatus(ctx);
    }
  } catch (error) {
    notifyDebug(ctx, `claude-mem passive capture skipped: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

export async function handleSessionCompact(
  ctx: ExtensionContext,
  sendMessage: (message: ProjectContextMessage) => void,
): Promise<void> {
  if (!isMemoryInjectionEnabled()) return;

  try {
    if (ctx.hasUI) {
      ctx.ui.setStatus("claude-mem-context", ctx.ui.theme.fg("warning", "mem: refreshing facts"));
    }
    const message = await buildProjectContextMessage(ctx, "compact");
    if (message) sendMessage(message);
  } catch (error) {
    notifyDebug(ctx, `claude-mem compact context skipped: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (ctx.hasUI) ctx.ui.setStatus("claude-mem-context", undefined);
    updateMemoryStatus(ctx);
  }
}

export async function handleToolResult(event: ToolResultEvent, ctx: ExtensionContext): Promise<ToolResultEventResult | undefined> {
  const project = getProjectInfo(ctx.cwd);

  try {
    await workerRequest("/api/sessions/observations", {
      method: "POST",
      body: JSON.stringify({
        contentSessionId: getContentSessionId(ctx),
        platformSource: PLATFORM_SOURCE,
        tool_name: event.toolName,
        tool_input: event.input,
        tool_response: {
          content: event.content,
          details: event.details,
          isError: event.isError,
        },
        cwd: ctx.cwd,
        toolUseId: event.toolCallId,
      }),
      timeoutMs: 10_000,
    });
  } catch (error) {
    notifyDebug(ctx, `claude-mem observation skipped: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (event.toolName !== "read" || event.isError) return undefined;

  try {
    const fileContext = await getFileContext(event, ctx, project.root);
    if (!fileContext) return undefined;

    const originalText = textFromToolContent(event.content);
    const augmentedText = originalText
      ? `${fileContext}\n\n---\n\n${originalText}`
      : fileContext;

    return {
      content: [{ type: "text", text: augmentedText }],
      details: event.details,
      isError: event.isError,
    };
  } catch (error) {
    notifyDebug(ctx, `claude-mem file context skipped: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

export async function handleAgentEnd(messages: AgentMessage[], ctx: ExtensionContext): Promise<void> {
  const lastAssistantMessage = getLastAssistantText(messages).trim();
  if (!lastAssistantMessage) return;

  try {
    await workerRequest("/api/sessions/summarize", {
      method: "POST",
      body: JSON.stringify({
        contentSessionId: getContentSessionId(ctx),
        platformSource: PLATFORM_SOURCE,
        last_assistant_message: lastAssistantMessage,
      }),
      timeoutMs: 10_000,
    });
  } catch (error) {
    notifyDebug(ctx, `claude-mem summary skipped: ${error instanceof Error ? error.message : String(error)}`);
  }
}
