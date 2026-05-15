import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { ensureWorkerAvailable, workerRequest } from "./client.js";
import { formatStatus, textResult, toolResultFromWorkerPayload } from "./format.js";
import {
  isMemoryInjectionEnabled,
  setMemoryInjectionEnabled,
  toggleMemoryInjection,
} from "./state.js";

const searchParameters = {
  type: "object",
  additionalProperties: false,
  properties: {
    query: { type: "string", description: "Search query. Optional when filtering by date/type." },
    limit: { type: "number", description: "Maximum results to return (default 20, max 100)." },
    project: { type: "string", description: "Project name filter." },
    type: { type: "string", enum: ["observations", "sessions", "prompts"], description: "Memory record type filter." },
    obs_type: { type: "string", description: "Comma-separated observation types: bugfix, feature, decision, discovery, change." },
    dateStart: { type: "string", description: "Start date as YYYY-MM-DD or epoch milliseconds." },
    dateEnd: { type: "string", description: "End date as YYYY-MM-DD or epoch milliseconds." },
    offset: { type: "number", description: "Number of results to skip." },
    orderBy: { type: "string", enum: ["date_desc", "date_asc", "relevance"], description: "Sort order." },
  },
} as any;

const timelineParameters = {
  type: "object",
  additionalProperties: false,
  properties: {
    anchor: { type: "number", description: "Observation ID to center the timeline around." },
    query: { type: "string", description: "Query used to find an anchor automatically when anchor is not provided." },
    depth_before: { type: "number", description: "Items before anchor (default 5, max 20)." },
    depth_after: { type: "number", description: "Items after anchor (default 5, max 20)." },
    project: { type: "string", description: "Project name filter." },
  },
} as any;

const observationsParameters = {
  type: "object",
  additionalProperties: false,
  required: ["ids"],
  properties: {
    ids: {
      type: "array",
      items: { type: "number" },
      description: "Observation IDs to fetch.",
    },
    orderBy: { type: "string", enum: ["date_desc", "date_asc"], description: "Sort order." },
    limit: { type: "number", description: "Maximum observations to return." },
    project: { type: "string", description: "Project name filter." },
  },
} as any;

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return textResult(message, { error: message }, true);
}

export function registerMemoryTools(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "mem_search",
    label: "claude-mem search",
    description: "Search claude-mem's persistent cross-session memory index. Use first to find relevant observation/session/prompt IDs.",
    promptSnippet: "Search claude-mem memory; use before mem_timeline and mem_get_observations.",
    parameters: searchParameters,
    async execute(_toolCallId, params) {
      try {
        const payload = await workerRequest("/api/search", { query: params as Record<string, unknown> });
        return toolResultFromWorkerPayload(payload);
      } catch (error) {
        return errorResult(error);
      }
    },
  });

  pi.registerTool({
    name: "mem_timeline",
    label: "claude-mem timeline",
    description: "Fetch chronological memory context around an observation ID or around the best match for a query.",
    promptSnippet: "Expand interesting claude-mem search hits into surrounding timeline context.",
    parameters: timelineParameters,
    async execute(_toolCallId, params) {
      try {
        const payload = await workerRequest("/api/timeline", { query: params as Record<string, unknown> });
        return toolResultFromWorkerPayload(payload);
      } catch (error) {
        return errorResult(error);
      }
    },
  });

  pi.registerTool({
    name: "mem_get_observations",
    label: "claude-mem observations",
    description: "Fetch full claude-mem observation records by ID after search/timeline filtering. Prefer batching multiple IDs.",
    promptSnippet: "Fetch full claude-mem observations by selected IDs after filtering.",
    parameters: observationsParameters,
    async execute(_toolCallId, params) {
      try {
        const payload = await workerRequest("/api/observations/batch", {
          method: "POST",
          body: JSON.stringify(params),
        });
        return toolResultFromWorkerPayload(payload);
      } catch (error) {
        return errorResult(error);
      }
    },
  });

  pi.registerTool({
    name: "mem_status",
    label: "claude-mem status",
    description: "Check whether the local claude-mem worker is reachable and ready.",
    promptSnippet: "Check claude-mem worker health when memory tools are unavailable.",
    parameters: { type: "object", additionalProperties: false, properties: {} } as any,
    async execute() {
      const status = await ensureWorkerAvailable();
      return textResult(formatStatus(status), status, !status.healthOk);
    },
  });
}

export function registerMemoryCommands(pi: ExtensionAPI): void {
  pi.registerCommand("cmem", {
    description: "Show claude-mem status or toggle project-context injection: /cmem on|off|toggle",
    handler: async (args, ctx) => {
      const text = Array.isArray(args) ? args.join(" ") : String(args ?? "");
      const action = text.trim().toLowerCase();

      if (action === "on" || action === "enable") {
        setMemoryInjectionEnabled(true, ctx);
        const message = "claude-mem project-context injection enabled";
        if (ctx.hasUI) ctx.ui.notify(message, "info"); else console.log(message);
        return;
      }

      if (action === "off" || action === "disable") {
        setMemoryInjectionEnabled(false, ctx);
        const message = "claude-mem project-context injection disabled";
        if (ctx.hasUI) ctx.ui.notify(message, "warning"); else console.log(message);
        return;
      }

      if (action === "toggle") {
        const enabled = toggleMemoryInjection(ctx);
        const message = `claude-mem project-context injection ${enabled ? "enabled" : "disabled"}`;
        if (ctx.hasUI) ctx.ui.notify(message, enabled ? "info" : "warning"); else console.log(message);
        return;
      }

      const status = await ensureWorkerAvailable();
      const message = `${formatStatus(status)}\nproject-context injection: ${isMemoryInjectionEnabled() ? "on" : "off"}`;
      if (ctx.hasUI) {
        ctx.ui.notify(message, status.healthOk ? "info" : "warning");
      } else {
        console.log(message);
      }
    },
  });
}
