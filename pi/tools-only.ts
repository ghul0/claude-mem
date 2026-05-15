/**
 * claude-mem Pi tools-only extension.
 *
 * This entry point intentionally registers only explicit memory tools/commands.
 * It does not register lifecycle hooks, passive capture, context injection, or
 * read-result augmentation. Use it for manual memory search without changing
 * Pi agent behavior.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerMemoryCommands, registerMemoryTools } from "./tools.js";

export default function claudeMemToolsOnlyExtension(pi: ExtensionAPI): void {
  registerMemoryTools(pi);
  registerMemoryCommands(pi);
}
