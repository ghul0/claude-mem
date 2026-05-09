import type { BeforeAgentStartEvent, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { spawn } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface CuratedMemoryContext {
  context: string;
  observationIds: number[];
  empty: boolean;
  raw?: string;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const extensionDir = dirname(fileURLToPath(import.meta.url));
const toolsOnlyExtensionPath = resolve(extensionDir, "tools-only.ts");
const curatorViewerPath = resolve(extensionDir, "curator-viewer.cjs");

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildCuratorPrompt(params: {
  userPrompt: string;
  project: string;
  cwd: string;
  conversationHistory: string;
}): string {
  return `You are claude-mem's Pi scout + memory curator. Do not solve the user's task.

Task: prepare the complete pre-task brief that the main coding agent needs before acting.
Project scope: ${params.project}
CWD: ${params.cwd}
User message: ${params.userPrompt}

Current conversation history, injected by the parent Pi extension:
${params.conversationHistory || "(no prior conversation history available)"}

You have read-only project access plus claude-mem memory tools. Use them to verify and sharpen memory, not merely repeat search titles.

Required workflow:
1. Use the injected conversation history to extract only the recent user intent, constraints, decisions, and already-tried steps.
2. Call mem_search with the user message and conversation-derived keywords, project=${params.project}, limit=10.
3. For relevant hits, call mem_get_observations for up to 8 observation IDs.
4. If search points to a cluster/session where nearby records matter, call mem_timeline and include only useful neighboring IDs.
5. Use read/grep/find/ls to verify or refine facts against the current project when paths, commits, tests, APIs, or implementation details matter.
6. If memory mentions files, include useful paths and, when helpful, line/range hints or short descriptions of important sections.

Output rules:
- Return ONLY JSON, no markdown fence.
- If no memory/project facts materially help, return {"empty":true,"context":"","observationIds":[]}.
- Otherwise context must start with "## claude-mem curated task context".
- Include FULL BASIC FACTS needed for the task, not just titles and not just IDs.
- Each bullet should include: source ID, concrete fact, current verification/status, relevant paths/commits/tests if present.
- Add related IDs inline when useful, e.g. "related: #8660, S153".
- Explicitly mark stale/uncertain facts if project verification contradicts or cannot confirm them.
- Do not include unrelated history. Do not invent uncited facts.
- Keep the brief compact, but it may be several thousand tokens if genuinely needed.

JSON schema:
{"empty":boolean,"context":"## claude-mem curated task context\\n\\n- [#id] full basic verified fact... path: pi/file.ts; related: #id2","observationIds":[8424]}`;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  const candidates: string[] = [];
  candidates.push(trimmed);

  for (const line of trimmed.split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith("{") && t.endsWith("}")) candidates.push(t);
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(trimmed.slice(first, last + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  return undefined;
}

function collectText(value: unknown, acc: string[] = []): string[] {
  if (!value) return acc;
  if (typeof value === "string") {
    acc.push(value);
    return acc;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, acc);
    return acc;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") acc.push(record.text);
    if (typeof record.content === "string") acc.push(record.content);
    if (record.content && record.content !== record.text) collectText(record.content, acc);
    if (record.message) collectText(record.message, acc);
    if (record.result) collectText(record.result, acc);
  }
  return acc;
}

function extractAssistantTextFromJsonEvents(stdout: string): string {
  let lastText = "";
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as Record<string, any>;
      if (event.type === "message_end" && event.message?.role === "assistant") {
        const text = collectText(event.message.content).join("\n").trim();
        if (text) lastText = text;
      }
      if (event.type === "message_update" && event.assistantMessageEvent?.type === "text_end") {
        const text = String(event.assistantMessageEvent.content ?? "").trim();
        if (text) lastText = text;
      }
    } catch {
      // not a JSON event line
    }
  }
  return lastText;
}

function normalizeCuratorOutput(stdout: string): CuratedMemoryContext {
  const eventText = extractAssistantTextFromJsonEvents(stdout);
  const source = eventText || stdout;
  const parsed = extractJsonObject(source);
  const candidateTexts = parsed ? collectText(parsed) : [];
  const raw = candidateTexts.length ? candidateTexts.join("\n") : source;
  const nested = extractJsonObject(raw);
  const record = (nested && typeof nested === "object" ? nested : parsed) as Record<string, unknown> | undefined;

  if (!record || typeof record !== "object") {
    return { empty: true, context: "", observationIds: [], raw: stdout };
  }

  const context = typeof record.context === "string"
    ? record.context.trim()
    : Array.isArray(record.context)
      ? record.context.filter((part): part is string => typeof part === "string").join("\n").trim()
      : "";
  const observationIds = Array.isArray(record.observationIds)
    ? record.observationIds.filter((id): id is number => typeof id === "number" && Number.isFinite(id))
    : [];
  const empty = record.empty === true || !context;

  return { empty, context: empty ? "" : context, observationIds, raw: stdout };
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function shouldOpenTmuxPane(): boolean {
  return ["1", "true", "yes", "on"].includes(String(process.env.CLAUDE_MEM_PI_CURATOR_TMUX_PANE ?? "").toLowerCase());
}

function openTmuxTailPane(stdoutPath: string, stderrPath: string, donePath: string): void {
  const target = process.env.CLAUDE_MEM_PI_CURATOR_TMUX_TARGET || "brain:claude-mem";
  const keepSeconds = parsePositiveInt(process.env.CLAUDE_MEM_PI_CURATOR_TMUX_KEEP_SECONDS, 20);
  const command = [
    "printf '\\033]2;claude-mem curator\\033\\\\'",
    `node ${shellQuote(curatorViewerPath)} ${shellQuote(stdoutPath)} ${shellQuote(stderrPath)} ${shellQuote(donePath)}`,
    `echo '# pane closes in ${keepSeconds}s'`,
    `sleep ${keepSeconds}`,
  ].join("; ");

  spawn("tmux", ["split-window", "-t", target, "-d", "bash", "-lc", command], {
    stdio: "ignore",
    detached: true,
  }).unref();
}

function formatConversationHistory(ctx: ExtensionContext): string {
  let entries: unknown[] = [];
  try {
    entries = ctx.sessionManager.getEntries?.() ?? [];
  } catch {
    return "";
  }

  const maxEntries = process.env.CLAUDE_MEM_PI_CURATOR_HISTORY_ENTRIES
    ? parsePositiveInt(process.env.CLAUDE_MEM_PI_CURATOR_HISTORY_ENTRIES, entries.length)
    : entries.length;
  const maxChars = process.env.CLAUDE_MEM_PI_CURATOR_HISTORY_CHARS
    ? parsePositiveInt(process.env.CLAUDE_MEM_PI_CURATOR_HISTORY_CHARS, Number.MAX_SAFE_INTEGER)
    : Number.MAX_SAFE_INTEGER;
  const maxEntryChars = process.env.CLAUDE_MEM_PI_CURATOR_HISTORY_ENTRY_CHARS
    ? parsePositiveInt(process.env.CLAUDE_MEM_PI_CURATOR_HISTORY_ENTRY_CHARS, Number.MAX_SAFE_INTEGER)
    : Number.MAX_SAFE_INTEGER;
  const lines: string[] = [];

  for (const entry of entries.slice(-maxEntries)) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const role = typeof record.role === "string"
      ? record.role
      : typeof record.type === "string"
        ? record.type
        : "entry";
    const text = textFromUnknown(record.content ?? record.message ?? record.text ?? record.data);
    if (!text.trim()) continue;
    const trimmed = text.trim();
    lines.push(`### ${role}\n${trimmed.length > maxEntryChars ? trimmed.slice(0, maxEntryChars) : trimmed}`);
  }

  const rendered = lines.join("\n\n---\n\n").trim();
  return rendered.length > maxChars
    ? rendered.slice(rendered.length - maxChars)
    : rendered;
}

function textFromUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textFromUnknown).filter(Boolean).join("\n");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (typeof record.content === "string") return record.content;
    return textFromUnknown(record.content ?? record.message ?? record.result ?? record.value);
  }
  return "";
}

function curatorTools(): string {
  const access = String(process.env.CLAUDE_MEM_PI_CURATOR_ACCESS || "readonly").toLowerCase();
  const memoryTools = "mem_search,mem_timeline,mem_get_observations,mem_status";
  if (access === "memory") return memoryTools;
  return `read,grep,find,ls,${memoryTools}`;
}

function extraExtensionArgs(): string[] {
  const raw = process.env.CLAUDE_MEM_PI_CURATOR_EXTRA_EXTENSIONS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => ["-e", entry]);
}

function runCuratorPi(prompt: string, ctx: ExtensionContext, timeoutMs: number): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const tempDir = mkdtempSync(join(tmpdir(), "claude-mem-pi-curator-"));
    const stdoutPath = join(tempDir, "stdout.txt");
    const stderrPath = join(tempDir, "stderr.txt");
    const donePath = join(tempDir, "done");
    writeFileSync(stdoutPath, "", "utf8");
    writeFileSync(stderrPath, "", "utf8");
    const showPane = shouldOpenTmuxPane();
    if (showPane) openTmuxTailPane(stdoutPath, stderrPath, donePath);
    const args = [
      "--no-extensions",
      "-e", toolsOnlyExtensionPath,
      ...extraExtensionArgs(),
      "--no-session",
      "--no-context-files",
      "--no-skills",
      "--no-builtin-tools",
      "--tools", curatorTools(),
      "--mode", "json",
      "-p", prompt,
    ];
    const stdoutFd = openSync(stdoutPath, "a");
    const stderrFd = openSync(stderrPath, "a");
    const child = spawn("pi", args, {
      cwd: ctx.cwd,
      env: { ...process.env },
      stdio: ["ignore", stdoutFd, stderrFd],
    });

    let settled = false;
    const cleanup = () => {
      try { closeSync(stdoutFd); } catch { /* ignore */ }
      try { closeSync(stderrFd); } catch { /* ignore */ }
      try { writeFileSync(donePath, "done", "utf8"); } catch { /* ignore */ }
      if (!showPane) {
        try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
      }
    };
    const readText = (path: string) => {
      try { return readFileSync(path, "utf8"); } catch { return ""; }
    };
    const readOutput = () => ({
      stdout: readText(stdoutPath),
      stderr: readText(stderrPath),
    });

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      cleanup();
      reject(new Error(`claude-mem curator timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      cleanup();
      reject(error);
    });
    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const { stdout, stderr } = readOutput();
      cleanup();
      if (code === 0) {
        resolvePromise(stdout);
      } else {
        reject(new Error(`claude-mem curator exited ${code ?? "unknown"}: ${stderr || stdout}`.trim()));
      }
    });
  });
}

export async function curateMemoryForPrompt(
  event: BeforeAgentStartEvent,
  ctx: ExtensionContext,
  project: string,
): Promise<CuratedMemoryContext> {
  const userPrompt = event.prompt?.trim() ? event.prompt : "[media prompt]";
  if (!userPrompt || userPrompt === "[media prompt]") {
    return { empty: true, context: "", observationIds: [] };
  }

  const timeoutMs = parsePositiveInt(process.env.CLAUDE_MEM_PI_CURATOR_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const prompt = buildCuratorPrompt({
    userPrompt,
    project,
    cwd: ctx.cwd,
    conversationHistory: formatConversationHistory(ctx),
  });

  const stdout = await runCuratorPi(prompt, ctx, timeoutMs);
  return normalizeCuratorOutput(stdout);
}
