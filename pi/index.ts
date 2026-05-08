/**
 * claude-mem Pi extension entry point.
 *
 * Phase 1/2: native Pi package surface plus worker discovery/startup.
 * Phase 3: passive memory capture and context injection.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureWorkerAvailable } from "./client.js";
import { handleAgentEnd, handleBeforeAgentStart, handleToolResult } from "./capture.js";
import { registerMemoryCommands, registerMemoryTools } from "./tools.js";

const extensionDir = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(extensionDir, "skills");

export default function claudeMemExtension(pi: ExtensionAPI): void {
  registerMemoryTools(pi);
  registerMemoryCommands(pi);

  pi.on("resources_discover", () => ({
    skillPaths: [skillsDir],
  }));

  pi.on("session_start", async (_event, ctx) => {
    const status = await ensureWorkerAvailable();
    if (!ctx.hasUI) return;
    if (status.ready) {
      ctx.ui.setStatus(
        "claude-mem",
        ctx.ui.theme.fg("dim", `claude-mem: ready @ :${status.port}`),
      );
    } else if (status.healthOk) {
      ctx.ui.setStatus(
        "claude-mem",
        ctx.ui.theme.fg("warning", `claude-mem: initializing @ :${status.port}`),
      );
    } else {
      ctx.ui.setStatus(
        "claude-mem",
        ctx.ui.theme.fg("warning", "claude-mem: worker unavailable. Run: npx claude-mem repair"),
      );
    }
  });

  pi.on("before_agent_start", handleBeforeAgentStart);

  pi.on("tool_result", handleToolResult);

  pi.on("agent_end", async (event, ctx) => {
    await handleAgentEnd(event.messages, ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    if (!ctx.hasUI) return;
    ctx.ui.setStatus("claude-mem", undefined);
  });
}
