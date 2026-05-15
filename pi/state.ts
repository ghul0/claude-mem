import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

let memoryInjectionEnabled = true;

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
