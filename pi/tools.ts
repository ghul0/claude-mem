import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { ensureWorkerAvailable, workerRequest } from "./client.js";
import { formatStatus, textResult, toolResultFromWorkerPayload } from "./format.js";
import {
  CURATOR_THINKING_LEVELS,
  getCuratorSettings,
  isMemoryInjectionEnabled,
  normalizeCuratorAccess,
  normalizeCuratorThinking,
  resetCuratorSettings,
  setMemoryInjectionEnabled,
  toggleMemoryInjection,
  updateCuratorSettings,
  type CuratorSettings,
} from "./state.js";
import { formatCuratorRunSummary, formatCuratorRunsList, getCurrentCuratorRun, getRecentCuratorRuns } from "./curator-run.js";

type PiModel = {
  provider: string;
  id: string;
  name?: string;
};

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

const curatorFlagNames = {
  access: "cmem-curator-access",
  model: "cmem-curator-model",
  thinking: "cmem-curator-thinking",
  timeoutMs: "cmem-curator-timeout-ms",
  tmuxPane: "cmem-curator-tmux-pane",
  tmuxTarget: "cmem-curator-tmux-target",
  tmuxKeepSeconds: "cmem-curator-tmux-keep-seconds",
  extraExtensions: "cmem-curator-extra-extensions",
  historyEntries: "cmem-curator-history-entries",
  historyChars: "cmem-curator-history-chars",
  historyEntryChars: "cmem-curator-history-entry-chars",
} as const;

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return textResult(message, { error: message }, true);
}

function modelRef(model: PiModel | undefined): string | undefined {
  return model ? `${model.provider}/${model.id}` : undefined;
}

function formatModelLabel(model: PiModel): string {
  const ref = modelRef(model)!;
  return model.name && model.name !== model.id ? `${ref} — ${model.name}` : ref;
}

function formatMaybeLimit(value: number | undefined): string {
  return value === undefined ? "unlimited" : String(value);
}

function formatCuratorModel(settings: CuratorSettings, ctx?: ExtensionContext): string {
  if (settings.modelMode === "selected") return settings.selectedModelLabel || settings.selectedModelRef || "selected";
  if (settings.modelMode === "current") return `current (${modelRef(ctx?.model as PiModel | undefined) ?? "unavailable"})`;
  return "auto (Pi default / parent --models if present)";
}

function formatCuratorSettings(ctx?: ExtensionContext): string {
  const settings = getCuratorSettings();
  return [
    "claude-mem curator:",
    `model: ${formatCuratorModel(settings, ctx)}`,
    `thinking: ${settings.thinking}`,
    `access: ${settings.access}`,
    `timeout: ${settings.timeoutMs}ms`,
    `tmux pane: ${settings.tmuxPane ? "on" : "off"}`,
    `tmux target: ${settings.tmuxTarget}`,
    `tmux keep: ${settings.tmuxKeepSeconds}s`,
    `extra extensions: ${settings.extraExtensions.length ? settings.extraExtensions.join(", ") : "none"}`,
    `history entries: ${formatMaybeLimit(settings.historyEntries)}`,
    `history chars: ${formatMaybeLimit(settings.historyChars)}`,
    `history entry chars: ${formatMaybeLimit(settings.historyEntryChars)}`,
  ].join("\n");
}

function notifyOrLog(ctx: ExtensionContext, message: string, type: "info" | "warning" | "error" = "info"): void {
  if (ctx.hasUI) ctx.ui.notify(message, type);
  else console.log(message);
}

function parsePositiveIntValue(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseOptionalLimitValue(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (!normalized || normalized === "none" || normalized === "off" || normalized === "unlimited") return undefined;
  return parsePositiveIntValue(normalized);
}

function splitCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function stringFlag(pi: ExtensionAPI, name: string): string | undefined {
  const value = pi.getFlag(name);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanFlag(pi: ExtensionAPI, name: string): boolean | undefined {
  const value = pi.getFlag(name);
  return typeof value === "boolean" ? value : undefined;
}

function applyModelSetting(raw: string, ctx?: ExtensionContext): void {
  const value = raw.trim();
  const normalized = value.toLowerCase();
  if (!value || normalized === "auto") {
    updateCuratorSettings({ modelMode: "auto", selectedModelRef: undefined, selectedModelLabel: undefined }, ctx);
  } else if (normalized === "current" || normalized === "inherit") {
    updateCuratorSettings({ modelMode: "current", selectedModelRef: undefined, selectedModelLabel: undefined }, ctx);
  } else {
    updateCuratorSettings({ modelMode: "selected", selectedModelRef: value, selectedModelLabel: value }, ctx);
  }
}

function registerCuratorFlags(pi: ExtensionAPI): void {
  pi.registerFlag(curatorFlagNames.access, {
    type: "string",
    description: "claude-mem curator access: readonly or memory",
  });
  pi.registerFlag(curatorFlagNames.model, {
    type: "string",
    description: "claude-mem curator model: auto, current, or provider/model",
  });
  pi.registerFlag(curatorFlagNames.thinking, {
    type: "string",
    description: "claude-mem curator thinking: auto, inherit, off, minimal, low, medium, high, xhigh",
  });
  pi.registerFlag(curatorFlagNames.timeoutMs, {
    type: "string",
    description: "claude-mem curator timeout in milliseconds",
  });
  pi.registerFlag(curatorFlagNames.tmuxPane, {
    type: "boolean",
    default: false,
    description: "Open a tmux log pane for the claude-mem curator",
  });
  pi.registerFlag(curatorFlagNames.tmuxTarget, {
    type: "string",
    description: "tmux target for curator log pane, e.g. brain:claude-mem",
  });
  pi.registerFlag(curatorFlagNames.tmuxKeepSeconds, {
    type: "string",
    description: "Seconds to keep curator tmux pane open after completion",
  });
  pi.registerFlag(curatorFlagNames.extraExtensions, {
    type: "string",
    description: "Comma-separated extra Pi extensions loaded into the curator subprocess",
  });
  pi.registerFlag(curatorFlagNames.historyEntries, {
    type: "string",
    description: "Max session entries injected into curator prompt; use unlimited to clear",
  });
  pi.registerFlag(curatorFlagNames.historyChars, {
    type: "string",
    description: "Max total history characters injected into curator prompt; use unlimited to clear",
  });
  pi.registerFlag(curatorFlagNames.historyEntryChars, {
    type: "string",
    description: "Max characters per injected history entry; use unlimited to clear",
  });
}

function applyCuratorFlags(pi: ExtensionAPI, ctx?: ExtensionContext): void {
  const access = stringFlag(pi, curatorFlagNames.access);
  if (access) updateCuratorSettings({ access: normalizeCuratorAccess(access, getCuratorSettings().access) }, ctx);

  const model = stringFlag(pi, curatorFlagNames.model);
  if (model) applyModelSetting(model, ctx);

  const thinking = stringFlag(pi, curatorFlagNames.thinking);
  if (thinking) updateCuratorSettings({ thinking: normalizeCuratorThinking(thinking, getCuratorSettings().thinking) }, ctx);

  const timeoutMs = parsePositiveIntValue(stringFlag(pi, curatorFlagNames.timeoutMs));
  if (timeoutMs) updateCuratorSettings({ timeoutMs }, ctx);

  const tmuxPane = booleanFlag(pi, curatorFlagNames.tmuxPane);
  if (tmuxPane !== undefined && tmuxPane) updateCuratorSettings({ tmuxPane }, ctx);

  const tmuxTarget = stringFlag(pi, curatorFlagNames.tmuxTarget);
  if (tmuxTarget) updateCuratorSettings({ tmuxTarget }, ctx);

  const tmuxKeepSeconds = parsePositiveIntValue(stringFlag(pi, curatorFlagNames.tmuxKeepSeconds));
  if (tmuxKeepSeconds) updateCuratorSettings({ tmuxKeepSeconds }, ctx);

  const extraExtensions = stringFlag(pi, curatorFlagNames.extraExtensions);
  if (extraExtensions !== undefined) updateCuratorSettings({ extraExtensions: splitCsv(extraExtensions) }, ctx);

  const historyEntries = stringFlag(pi, curatorFlagNames.historyEntries);
  if (historyEntries !== undefined) updateCuratorSettings({ historyEntries: parseOptionalLimitValue(historyEntries) }, ctx);

  const historyChars = stringFlag(pi, curatorFlagNames.historyChars);
  if (historyChars !== undefined) updateCuratorSettings({ historyChars: parseOptionalLimitValue(historyChars) }, ctx);

  const historyEntryChars = stringFlag(pi, curatorFlagNames.historyEntryChars);
  if (historyEntryChars !== undefined) updateCuratorSettings({ historyEntryChars: parseOptionalLimitValue(historyEntryChars) }, ctx);
}

function argvValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === `--${name}`) return process.argv[i + 1];
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return undefined;
}

function readJsonFile(path: string): Record<string, unknown> | undefined {
  try {
    if (!existsSync(path)) return undefined;
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function findNearestProjectSettings(cwd: string): string | undefined {
  let current = cwd;
  while (true) {
    const candidate = join(current, ".pi", "settings.json");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function enabledModelPatterns(cwd: string): string[] {
  const cliModels = argvValue("models");
  if (cliModels) return splitCsv(cliModels);

  const projectSettings = findNearestProjectSettings(cwd);
  const projectEnabled = projectSettings ? readJsonFile(projectSettings)?.enabledModels : undefined;
  if (Array.isArray(projectEnabled)) return projectEnabled.filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  const agentDir = process.env.PI_AGENT_DIR || join(homedir(), ".pi", "agent");
  const globalEnabled = readJsonFile(join(agentDir, "settings.json"))?.enabledModels;
  if (Array.isArray(globalEnabled)) return globalEnabled.filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  return [];
}

function stripThinkingSuffix(pattern: string): string {
  const index = pattern.lastIndexOf(":");
  if (index === -1) return pattern;
  const suffix = pattern.slice(index + 1).toLowerCase();
  return (CURATOR_THINKING_LEVELS as string[]).includes(suffix) ? pattern.slice(0, index) : pattern;
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegExp(pattern: string): RegExp {
  const source = pattern
    .split("")
    .map((char) => {
      if (char === "*") return ".*";
      if (char === "?") return ".";
      return escapeRegExp(char);
    })
    .join("");
  return new RegExp(`^${source}$`, "i");
}

function modelMatchesPattern(model: PiModel, rawPattern: string): boolean {
  const pattern = stripThinkingSuffix(rawPattern.trim());
  if (!pattern) return false;
  const ref = modelRef(model)!;
  const haystacks = [ref, model.id, model.name ?? ""];
  if (pattern.includes("*") || pattern.includes("?")) {
    const re = globToRegExp(pattern);
    return haystacks.some((value) => re.test(value));
  }
  const lower = pattern.toLowerCase();
  return haystacks.some((value) => value.toLowerCase() === lower)
    || haystacks.some((value) => value.toLowerCase().includes(lower));
}

function scopedModelCandidates(ctx: ExtensionContext): PiModel[] {
  const available = ctx.modelRegistry.getAvailable() as PiModel[];
  const patterns = enabledModelPatterns(ctx.cwd);
  const selected = new Map<string, PiModel>();

  if (patterns.length > 0) {
    for (const pattern of patterns) {
      for (const model of available) {
        if (modelMatchesPattern(model, pattern)) selected.set(modelRef(model)!, model);
      }
    }
  }

  if (selected.size === 0) {
    for (const model of available) selected.set(modelRef(model)!, model);
  }

  const current = ctx.model as PiModel | undefined;
  if (current) selected.set(modelRef(current)!, current);

  return Array.from(selected.values());
}

async function chooseCuratorModel(ctx: ExtensionCommandContext): Promise<void> {
  const currentRef = modelRef(ctx.model as PiModel | undefined);
  const models = scopedModelCandidates(ctx);
  const labels = new Map<string, { ref?: string; label?: string; mode: "auto" | "current" | "selected" }>();
  const options = [
    "auto — Pi subprocess default / parent --models",
    `current — inherit main Pi model${currentRef ? ` (${currentRef})` : ""}`,
  ];

  labels.set(options[0], { mode: "auto" });
  labels.set(options[1], { mode: "current" });

  for (const model of models.slice(0, 120)) {
    const ref = modelRef(model)!;
    const label = formatModelLabel(model);
    options.push(label);
    labels.set(label, { mode: "selected", ref, label });
  }

  const choice = await ctx.ui.select("Curator model", options);
  if (!choice) return;
  const selected = labels.get(choice);
  if (!selected) return;
  if (selected.mode === "auto") {
    updateCuratorSettings({ modelMode: "auto", selectedModelRef: undefined, selectedModelLabel: undefined }, ctx);
  } else if (selected.mode === "current") {
    updateCuratorSettings({ modelMode: "current", selectedModelRef: undefined, selectedModelLabel: undefined }, ctx);
  } else if (selected.ref) {
    updateCuratorSettings({ modelMode: "selected", selectedModelRef: selected.ref, selectedModelLabel: selected.label ?? selected.ref }, ctx);
  }
  notifyOrLog(ctx, formatCuratorSettings(ctx), "info");
}

async function chooseCuratorThinking(ctx: ExtensionCommandContext): Promise<void> {
  const options = ["auto", "inherit", ...CURATOR_THINKING_LEVELS];
  const choice = await ctx.ui.select("Curator thinking level", options);
  if (!choice) return;
  updateCuratorSettings({ thinking: normalizeCuratorThinking(choice) }, ctx);
  notifyOrLog(ctx, formatCuratorSettings(ctx), "info");
}

async function chooseCuratorAccess(ctx: ExtensionCommandContext): Promise<void> {
  const choice = await ctx.ui.select("Curator access", ["readonly", "memory"]);
  if (!choice) return;
  updateCuratorSettings({ access: normalizeCuratorAccess(choice) }, ctx);
  notifyOrLog(ctx, formatCuratorSettings(ctx), "info");
}

async function inputPositiveInt(ctx: ExtensionCommandContext, title: string, current: number): Promise<number | undefined> {
  const value = await ctx.ui.input(title, String(current));
  if (value === undefined) return undefined;
  const parsed = parsePositiveIntValue(value);
  if (!parsed) notifyOrLog(ctx, `Invalid positive integer: ${value}`, "error");
  return parsed;
}

async function inputOptionalLimit(ctx: ExtensionCommandContext, title: string, current: number | undefined): Promise<number | undefined | "cancelled"> {
  const value = await ctx.ui.input(title, current === undefined ? "unlimited" : String(current));
  if (value === undefined) return "cancelled";
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "unlimited" || normalized === "none" || normalized === "off") return undefined;
  const parsed = parsePositiveIntValue(value);
  if (!parsed) {
    notifyOrLog(ctx, `Invalid positive integer or unlimited: ${value}`, "error");
    return "cancelled";
  }
  return parsed;
}

async function showHistoryMenu(ctx: ExtensionCommandContext): Promise<void> {
  while (true) {
    const settings = getCuratorSettings();
    const choice = await ctx.ui.select("Curator history limits", [
      `entries: ${formatMaybeLimit(settings.historyEntries)}`,
      `total chars: ${formatMaybeLimit(settings.historyChars)}`,
      `entry chars: ${formatMaybeLimit(settings.historyEntryChars)}`,
      "back",
    ]);
    if (!choice || choice === "back") return;
    if (choice.startsWith("entries:")) {
      const value = await inputOptionalLimit(ctx, "Max history entries (number or unlimited)", settings.historyEntries);
      if (value !== "cancelled") updateCuratorSettings({ historyEntries: value }, ctx);
    } else if (choice.startsWith("total chars:")) {
      const value = await inputOptionalLimit(ctx, "Max total history chars (number or unlimited)", settings.historyChars);
      if (value !== "cancelled") updateCuratorSettings({ historyChars: value }, ctx);
    } else if (choice.startsWith("entry chars:")) {
      const value = await inputOptionalLimit(ctx, "Max chars per history entry (number or unlimited)", settings.historyEntryChars);
      if (value !== "cancelled") updateCuratorSettings({ historyEntryChars: value }, ctx);
    }
  }
}

async function showCuratorMenu(ctx: ExtensionCommandContext): Promise<void> {
  while (true) {
    const settings = getCuratorSettings();
    const choice = await ctx.ui.select("claude-mem curator", [
      "status",
      "last",
      "sessions",
      `model: ${formatCuratorModel(settings, ctx)}`,
      `thinking: ${settings.thinking}`,
      `access: ${settings.access}`,
      `timeout: ${settings.timeoutMs}ms`,
      `tmux pane: ${settings.tmuxPane ? "on" : "off"}`,
      `tmux target: ${settings.tmuxTarget}`,
      `tmux keep: ${settings.tmuxKeepSeconds}s`,
      `extra extensions: ${settings.extraExtensions.length ? settings.extraExtensions.join(", ") : "none"}`,
      "history limits",
      "reset to env/defaults",
      "close",
    ]);

    if (!choice || choice === "close") return;
    if (choice === "status") {
      notifyOrLog(ctx, formatCuratorSettings(ctx), "info");
    } else if (choice === "last") {
      const run = getRecentCuratorRuns()[0];
      notifyOrLog(ctx, run ? formatCuratorRunSummary(run) : "No curator sessions recorded in this Pi process.", "info");
    } else if (choice === "sessions") {
      notifyOrLog(ctx, formatCuratorRunsList(), "info");
    } else if (choice.startsWith("model:")) {
      await chooseCuratorModel(ctx);
    } else if (choice.startsWith("thinking:")) {
      await chooseCuratorThinking(ctx);
    } else if (choice.startsWith("access:")) {
      await chooseCuratorAccess(ctx);
    } else if (choice.startsWith("timeout:")) {
      const value = await inputPositiveInt(ctx, "Curator timeout in milliseconds", settings.timeoutMs);
      if (value) updateCuratorSettings({ timeoutMs: value }, ctx);
    } else if (choice.startsWith("tmux pane:")) {
      updateCuratorSettings({ tmuxPane: !settings.tmuxPane }, ctx);
      notifyOrLog(ctx, formatCuratorSettings(ctx), "info");
    } else if (choice.startsWith("tmux target:")) {
      const value = await ctx.ui.input("Curator tmux target", settings.tmuxTarget);
      if (value !== undefined && value.trim()) updateCuratorSettings({ tmuxTarget: value.trim() }, ctx);
    } else if (choice.startsWith("tmux keep:")) {
      const value = await inputPositiveInt(ctx, "Curator tmux keep seconds", settings.tmuxKeepSeconds);
      if (value) updateCuratorSettings({ tmuxKeepSeconds: value }, ctx);
    } else if (choice.startsWith("extra extensions:")) {
      const value = await ctx.ui.input("Extra curator extensions (comma-separated)", settings.extraExtensions.join(","));
      if (value !== undefined) updateCuratorSettings({ extraExtensions: splitCsv(value) }, ctx);
    } else if (choice === "history limits") {
      await showHistoryMenu(ctx);
    } else if (choice === "reset to env/defaults") {
      resetCuratorSettings(ctx);
      notifyOrLog(ctx, formatCuratorSettings(ctx), "info");
    }
  }
}

function commandWords(text: string): [string, string] {
  const trimmed = text.trim();
  if (!trimmed) return ["", ""];
  const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(trimmed);
  return [match?.[1]?.toLowerCase() ?? "", match?.[2] ?? ""];
}

function applyCuratorCommandArg(command: string, value: string, ctx: ExtensionContext): boolean {
  switch (command) {
    case "model":
      applyModelSetting(value, ctx);
      return true;
    case "thinking":
      updateCuratorSettings({ thinking: normalizeCuratorThinking(value, getCuratorSettings().thinking) }, ctx);
      return true;
    case "access":
      updateCuratorSettings({ access: normalizeCuratorAccess(value, getCuratorSettings().access) }, ctx);
      return true;
    case "timeout":
    case "timeout-ms": {
      const parsed = parsePositiveIntValue(value);
      if (!parsed) return false;
      updateCuratorSettings({ timeoutMs: parsed }, ctx);
      return true;
    }
    case "tmux":
    case "tmux-pane": {
      const normalized = value.trim().toLowerCase();
      if (!["on", "off", "true", "false", "1", "0"].includes(normalized)) return false;
      updateCuratorSettings({ tmuxPane: normalized === "on" || normalized === "true" || normalized === "1" }, ctx);
      return true;
    }
    case "tmux-target":
      if (!value.trim()) return false;
      updateCuratorSettings({ tmuxTarget: value.trim() }, ctx);
      return true;
    case "tmux-keep":
    case "tmux-keep-seconds": {
      const parsed = parsePositiveIntValue(value);
      if (!parsed) return false;
      updateCuratorSettings({ tmuxKeepSeconds: parsed }, ctx);
      return true;
    }
    case "extra":
    case "extra-extensions":
      updateCuratorSettings({ extraExtensions: splitCsv(value) }, ctx);
      return true;
    case "history-entries":
      updateCuratorSettings({ historyEntries: parseOptionalLimitValue(value) }, ctx);
      return true;
    case "history-chars":
      updateCuratorSettings({ historyChars: parseOptionalLimitValue(value) }, ctx);
      return true;
    case "history-entry-chars":
      updateCuratorSettings({ historyEntryChars: parseOptionalLimitValue(value) }, ctx);
      return true;
    default:
      return false;
  }
}

async function handleCuratorCommand(args: unknown, ctx: ExtensionCommandContext): Promise<void> {
  const text = Array.isArray(args) ? args.join(" ") : String(args ?? "");
  const [command, value] = commandWords(text);

  if (command === "sessions" || command === "runs" || command === "history") {
    notifyOrLog(ctx, formatCuratorRunsList(), "info");
    return;
  }

  if (command === "current") {
    const run = getCurrentCuratorRun();
    notifyOrLog(ctx, run ? formatCuratorRunSummary(run) : "No curator run is currently active.", "info");
    return;
  }

  if (command === "last" || command === "trace") {
    const run = getRecentCuratorRuns()[0];
    notifyOrLog(ctx, run ? formatCuratorRunSummary(run) : "No curator sessions recorded in this Pi process.", "info");
    return;
  }

  if (command === "show") {
    const id = Number.parseInt(value.trim(), 10);
    const run = getRecentCuratorRuns().find((item) => item.id === id);
    notifyOrLog(ctx, run ? formatCuratorRunSummary(run) : `No curator run #${value.trim()} recorded in this Pi process.`, run ? "info" : "warning");
    return;
  }

  if (!command && ctx.hasUI) {
    await showCuratorMenu(ctx);
    return;
  }

  if (!command || command === "status") {
    notifyOrLog(ctx, formatCuratorSettings(ctx), "info");
    return;
  }

  if (command === "reset") {
    resetCuratorSettings(ctx);
    notifyOrLog(ctx, formatCuratorSettings(ctx), "info");
    return;
  }

  if (command === "menu" && ctx.hasUI) {
    await showCuratorMenu(ctx);
    return;
  }

  const ok = applyCuratorCommandArg(command, value, ctx);
  if (!ok) {
    notifyOrLog(
      ctx,
      "Usage: /curator [status|menu|sessions|last|current|show <id>|reset|model <auto|current|provider/model>|thinking <auto|inherit|off|minimal|low|medium|high|xhigh>|access <readonly|memory>|timeout <ms>|tmux <on|off>|tmux-target <target>|tmux-keep <seconds>|extra-extensions <csv>|history-entries <n|unlimited>|history-chars <n|unlimited>|history-entry-chars <n|unlimited>]",
      "warning",
    );
    return;
  }

  notifyOrLog(ctx, formatCuratorSettings(ctx), "info");
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
  registerCuratorFlags(pi);
  applyCuratorFlags(pi);

  pi.on("session_start", (_event, ctx) => {
    applyCuratorFlags(pi, ctx);
  });

  pi.registerCommand("cmem", {
    description: "Show claude-mem status or toggle context injection: /cmem on|off|toggle",
    handler: async (args, ctx) => {
      const text = Array.isArray(args) ? args.join(" ") : String(args ?? "");
      const action = text.trim().toLowerCase();

      if (action === "on" || action === "enable") {
        setMemoryInjectionEnabled(true, ctx);
        const message = "claude-mem context injection enabled";
        if (ctx.hasUI) ctx.ui.notify(message, "info"); else console.log(message);
        return;
      }
      if (action === "off" || action === "disable") {
        setMemoryInjectionEnabled(false, ctx);
        const message = "claude-mem context injection disabled";
        if (ctx.hasUI) ctx.ui.notify(message, "warning"); else console.log(message);
        return;
      }
      if (action === "toggle") {
        const enabled = toggleMemoryInjection(ctx);
        const message = `claude-mem context injection ${enabled ? "enabled" : "disabled"}`;
        if (ctx.hasUI) ctx.ui.notify(message, enabled ? "info" : "warning"); else console.log(message);
        return;
      }

      const status = await ensureWorkerAvailable();
      const message = `${formatStatus(status)}\ncontext injection: ${isMemoryInjectionEnabled() ? "on" : "off"}`;
      if (ctx.hasUI) {
        ctx.ui.notify(message, status.healthOk ? "info" : "warning");
      } else {
        console.log(message);
      }
    },
  });

  pi.registerCommand("curator", {
    description: "Configure claude-mem Pi curator: /curator opens menu; /curator status prints settings",
    handler: async (args, ctx) => {
      applyCuratorFlags(pi, ctx);
      await handleCuratorCommand(args, ctx);
    },
  });
}
