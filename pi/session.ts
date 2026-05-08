import type { AgentMessage, ExtensionContext } from "@earendil-works/pi-coding-agent";

export function getContentSessionId(ctx: ExtensionContext): string {
  return `pi:${ctx.sessionManager.getSessionId()}`;
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      const maybeText = part as { type?: unknown; text?: unknown };
      return maybeText.type === "text" && typeof maybeText.text === "string" ? maybeText.text : "";
    })
    .filter(Boolean)
    .join("\n");
}

export function getLastAssistantText(messages: AgentMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as { role?: unknown; content?: unknown };
    if (message.role !== "assistant") continue;
    const text = textFromContent(message.content).trim();
    if (text) return text;
  }
  return "";
}
