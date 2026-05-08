import type {
  AgentMessage,
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionContext,
  ToolResultEvent,
} from "@earendil-works/pi-coding-agent";
import { workerRequest } from "./client.js";
import { getProjectInfo } from "./project.js";
import { getContentSessionId, getLastAssistantText } from "./session.js";

const PLATFORM_SOURCE = "pi";
const SEMANTIC_CONTEXT_MIN_PROMPT_LENGTH = 20;

interface SessionInitResponse {
  sessionDbId?: number;
  promptNumber?: number;
  skipped?: boolean;
  reason?: string;
  contextInjected?: boolean;
}

interface SemanticContextResponse {
  context?: string;
  count?: number;
}

function notifyDebug(ctx: ExtensionContext, message: string): void {
  if (!ctx.hasUI || process.env.CLAUDE_MEM_PI_DEBUG !== "true") return;
  ctx.ui.notify(message, "warning");
}

function joinContextParts(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n---\n\n");
}

async function getContextInject(project: string): Promise<string> {
  const payload = await workerRequest<string>("/api/context/inject", {
    query: { projects: project },
    timeoutMs: 10_000,
  });
  return typeof payload === "string" ? payload.trim() : "";
}

async function getSemanticContext(prompt: string, project: string): Promise<string> {
  if (!prompt || prompt.length < SEMANTIC_CONTEXT_MIN_PROMPT_LENGTH || prompt === "[media prompt]") return "";

  const payload = await workerRequest<SemanticContextResponse>("/api/context/semantic", {
    method: "POST",
    body: JSON.stringify({ q: prompt, project, limit: 5 }),
    timeoutMs: 10_000,
  });

  return typeof payload?.context === "string" ? payload.context.trim() : "";
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

    if (init?.skipped) return undefined;

    const [timelineContext, semanticContext] = await Promise.all([
      getContextInject(project.root).catch(() => ""),
      getSemanticContext(prompt, project.root).catch(() => ""),
    ]);

    const content = joinContextParts([timelineContext, semanticContext]);
    if (!content) return undefined;

    return {
      message: {
        customType: "claude-mem-context",
        content,
        display: true,
        details: {
          contentSessionId,
          project: project.root,
          projectName: project.name,
          promptNumber: init?.promptNumber,
          sessionDbId: init?.sessionDbId,
        },
      },
    };
  } catch (error) {
    notifyDebug(ctx, `claude-mem passive capture skipped: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

export async function handleToolResult(event: ToolResultEvent, ctx: ExtensionContext): Promise<void> {
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
