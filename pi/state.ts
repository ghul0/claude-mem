import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export type CuratorAccess = "memory" | "readonly";
export type CuratorModelMode = "auto" | "current" | "selected";
export type CuratorThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
export type CuratorThinkingSetting = "auto" | "inherit" | CuratorThinkingLevel;

export interface CuratorSettings {
  access: CuratorAccess;
  modelMode: CuratorModelMode;
  selectedModelRef?: string;
  selectedModelLabel?: string;
  thinking: CuratorThinkingSetting;
  timeoutMs: number;
  tmuxPane: boolean;
  tmuxTarget: string;
  tmuxKeepSeconds: number;
  extraExtensions: string[];
  historyEntries?: number;
  historyChars?: number;
  historyEntryChars?: number;
}

export const CURATOR_THINKING_LEVELS: CuratorThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];
export const DEFAULT_CURATOR_TIMEOUT_MS = 120_000;
export const DEFAULT_CURATOR_TMUX_TARGET = "brain:claude-mem";
export const DEFAULT_CURATOR_TMUX_KEEP_SECONDS = 20;
export const DEFAULT_CURATOR_HISTORY_ENTRIES = 30;
export const DEFAULT_CURATOR_HISTORY_CHARS = 20_000;
export const DEFAULT_CURATOR_HISTORY_ENTRY_CHARS = 3_000;

let memoryInjectionEnabled = true;
let curatorSettings = readCuratorSettingsFromEnv();

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalPositiveInt(value: string | undefined, fallback?: number): number | undefined {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "none" || normalized === "off" || normalized === "unlimited") return undefined;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function normalizeCuratorAccess(value: string | undefined, fallback: CuratorAccess = "readonly"): CuratorAccess {
  const normalized = value?.trim().toLowerCase();
  return normalized === "memory" || normalized === "readonly" ? normalized : fallback;
}

export function normalizeCuratorThinking(value: string | undefined, fallback: CuratorThinkingSetting = "auto"): CuratorThinkingSetting {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === "auto") return "auto";
  if (normalized === "inherit" || normalized === "current") return "inherit";
  if ((CURATOR_THINKING_LEVELS as string[]).includes(normalized)) return normalized as CuratorThinkingLevel;
  return fallback;
}

function splitCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readCuratorSettingsFromEnv(): CuratorSettings {
  const model = process.env.CLAUDE_MEM_PI_CURATOR_MODEL?.trim();
  const normalizedModel = model?.toLowerCase();
  const modelMode: CuratorModelMode = !model || normalizedModel === "auto"
    ? "auto"
    : normalizedModel === "current" || normalizedModel === "inherit"
      ? "current"
      : "selected";

  return {
    access: normalizeCuratorAccess(process.env.CLAUDE_MEM_PI_CURATOR_ACCESS),
    modelMode,
    selectedModelRef: modelMode === "selected" ? model : undefined,
    selectedModelLabel: modelMode === "selected" ? model : undefined,
    thinking: normalizeCuratorThinking(process.env.CLAUDE_MEM_PI_CURATOR_THINKING),
    timeoutMs: parsePositiveInt(process.env.CLAUDE_MEM_PI_CURATOR_TIMEOUT_MS, DEFAULT_CURATOR_TIMEOUT_MS),
    tmuxPane: parseBoolean(process.env.CLAUDE_MEM_PI_CURATOR_TMUX_PANE),
    tmuxTarget: process.env.CLAUDE_MEM_PI_CURATOR_TMUX_TARGET?.trim() || DEFAULT_CURATOR_TMUX_TARGET,
    tmuxKeepSeconds: parsePositiveInt(process.env.CLAUDE_MEM_PI_CURATOR_TMUX_KEEP_SECONDS, DEFAULT_CURATOR_TMUX_KEEP_SECONDS),
    extraExtensions: splitCsv(process.env.CLAUDE_MEM_PI_CURATOR_EXTRA_EXTENSIONS),
    historyEntries: parseOptionalPositiveInt(process.env.CLAUDE_MEM_PI_CURATOR_HISTORY_ENTRIES, DEFAULT_CURATOR_HISTORY_ENTRIES),
    historyChars: parseOptionalPositiveInt(process.env.CLAUDE_MEM_PI_CURATOR_HISTORY_CHARS, DEFAULT_CURATOR_HISTORY_CHARS),
    historyEntryChars: parseOptionalPositiveInt(process.env.CLAUDE_MEM_PI_CURATOR_HISTORY_ENTRY_CHARS, DEFAULT_CURATOR_HISTORY_ENTRY_CHARS),
  };
}

export function isMemoryInjectionEnabled(): boolean {
  return memoryInjectionEnabled;
}

export function setMemoryInjectionEnabled(enabled: boolean, ctx?: ExtensionContext): boolean {
  memoryInjectionEnabled = enabled;
  updateMemoryStatus(ctx);
  return memoryInjectionEnabled;
}

export function toggleMemoryInjection(ctx?: ExtensionContext): boolean {
  memoryInjectionEnabled = !memoryInjectionEnabled;
  updateMemoryStatus(ctx);
  return memoryInjectionEnabled;
}

export function getCuratorSettings(): CuratorSettings {
  return {
    ...curatorSettings,
    extraExtensions: [...curatorSettings.extraExtensions],
  };
}

export function updateCuratorSettings(updates: Partial<CuratorSettings>, ctx?: ExtensionContext): CuratorSettings {
  curatorSettings = {
    ...curatorSettings,
    ...updates,
    extraExtensions: updates.extraExtensions ? [...updates.extraExtensions] : curatorSettings.extraExtensions,
  };
  updateMemoryStatus(ctx);
  return getCuratorSettings();
}

export function resetCuratorSettings(ctx?: ExtensionContext): CuratorSettings {
  curatorSettings = readCuratorSettingsFromEnv();
  updateMemoryStatus(ctx);
  return getCuratorSettings();
}

export function updateMemoryStatus(ctx?: ExtensionContext): void {
  if (!ctx?.hasUI) return;
  const theme = ctx.ui.theme;
  ctx.ui.setStatus(
    "claude-mem-inject",
    memoryInjectionEnabled
      ? theme.fg("accent", "mem: on")
      : theme.fg("dim", "mem: off"),
  );
}
