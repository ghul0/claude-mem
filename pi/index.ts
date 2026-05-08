/**
 * claude-mem Pi extension entry point.
 *
 * Phase 1/2: native Pi package surface plus worker discovery/startup.
 * Passive capture/injection lifecycle hooks are implemented in later phases.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureWorkerAvailable } from "./client.js";
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
    if (!ctx.hasUI) return;

    const status = await ensureWorkerAvailable();
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

  pi.on("session_shutdown", async (_event, ctx) => {
    if (!ctx.hasUI) return;
    ctx.ui.setStatus("claude-mem", undefined);
  });
}
