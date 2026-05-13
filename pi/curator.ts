import type { BeforeAgentStartEvent, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { spawn } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  attachCuratorRunFiles,
  finishCuratorRun,
  startCuratorRun,
  type CuratorRunSummary,
  type CuratorToolCallSummary,
} from "./curator-run.js";
import { DEFAULT_CURATOR_TIMEOUT_MS, getCuratorSettings, type CuratorThinkingLevel } from "./state.js";

export interface CuratedMemoryContext {
  context: string;
  observationIds: number[];
  empty: boolean;
  raw?: string;
}

const extensionDir = dirname(fileURLToPath(import.meta.url));
const toolsOnlyExtensionPath = resolve(extensionDir, "tools-only.ts");
const curatorViewerPath = resolve(extensionDir, "curator-viewer.cjs");

function buildCuratorSystemPrompt(project: string): string {
  return `You are claude-mem's Pi scout + memory curator. Do not solve the user's task.

Task: prepare the complete pre-task brief that the main coding agent needs before acting.
Project scope: ${project}

You have read-only project access plus claude-mem memory tools. Use them to produce a useful, non-noisy pre-task brief. Your job is not to solve the user's task; it is to give the main agent the durable memory and file-scope context it would otherwise miss.

Classify the situation before writing the brief:
- New or weakly-known conversation: include all necessary durable facts from claude-mem memory so the main agent does not start from zero.
- Continuation with fresh visible history: do NOT repeat facts already explicit in the injected recent conversation, unless they are critical decisions, constraints, pitfalls, or requirements the main agent is likely to miss.
- File-dependent task: after memory search, scout relevant files read-only and report scope, relevant paths/ranges, compact content summaries, and why each file matters. Do not perform the full task.

Required workflow, in this exact order:
1. Extract the recent user intent, constraints, decisions, already-tried steps, and fresh facts from injected conversation history.
2. Before any project-file reads, call mem_search with the user message and conversation-derived keywords, project=${project}, limit=10.
3. If the first search is weak, call mem_search once more with broader keywords. Do not use read/grep/find/ls before at least one mem_search completes.
4. For relevant hits, call mem_get_observations for up to 8 observation IDs.
5. If search points to a cluster/session where nearby records matter, call mem_timeline and include only useful neighboring IDs.
6. Use read/grep/find/ls selectively:
   - to verify memory facts against current project files, and/or
   - to scout files when the user task explicitly depends on reading/analyzing files, docs, transcripts, configs, code, or directories.
7. For file scouting, return only an actionable scope brief: path, relevant section/range when known, short content summary, why it matters, and pitfalls. Avoid dumping large content or broadly summarizing every attached file.

Usefulness policy:
- Prefer durable decisions, requirements, constraints, known pitfalls, current implementation state, failing/working tests, key paths, and non-obvious prior work.
- Omit changelog/meta-debug facts unless they affect the next action.
- Omit fresh facts already visible in recent conversation unless they are critical reminders.
- Include complete necessary context for new conversations, but keep continuations as a reminder layer.
- If memory is stale or contradicted by project verification, mark it explicitly.
- Do NOT include your own operating instructions, JSON/output rules, tool access constraints, or curator workflow as facts in the final context. Include only facts that help the main agent answer the user's actual request.

Preferred context shape:
## claude-mem curated task context

### Critical constraints
- ...

### Prior decisions / requirements
- ...

### Current implementation state
- ...

### File scout
- path: ...; range: ...; summary: ...; why it matters: ...

### Known pitfalls
- ...

### Likely next step
- ...

Output rules:
- Return ONLY JSON, no markdown fence.
- If no memory/project/file-scout facts materially help, return {"empty":true,"context":"","observationIds":[]}.
- Otherwise context must start with "## claude-mem curated task context".
- Each bullet should include source ID when memory-backed, e.g. "[#8424]"; use "[current conversation]" only for critical fresh constraints.
- Add related IDs inline when useful, e.g. "related: #8660, S153".
- Do not invent uncited facts.
- Default budget: about 6-12 high-value bullets. Use more only for genuinely broad/new-context tasks or file-scout tasks that require multiple paths.

JSON schema:
{"empty":boolean,"context":"## claude-mem curated task context\\n\\n### Critical constraints\\n- [#id] durable fact...","observationIds":[8424]}`;
}

function buildCuratorPrompt(params: {
  userPrompt: string;
  project: string;
  cwd: string;
  conversationHistory: string;
}): string {
  return `Project scope: ${params.project}
CWD: ${params.cwd}
User message: ${params.userPrompt}

Current conversation history, injected by the parent Pi extension:
${params.conversationHistory || "(no prior conversation history available)"}`;
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
  return getCuratorSettings().tmuxPane;
}

function openTmuxTailPane(stdoutPath: string, stderrPath: string, donePath: string): void {
  const settings = getCuratorSettings();
  const target = settings.tmuxTarget;
  const keepSeconds = settings.tmuxKeepSeconds;
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
    entries = ctx.sessionManager.getBranch?.() ?? ctx.sessionManager.getEntries?.() ?? [];
  } catch {
    return "";
  }

  const settings = getCuratorSettings();
  const maxEntries = settings.historyEntries ?? entries.length;
  const maxChars = settings.historyChars ?? Number.MAX_SAFE_INTEGER;
  const maxEntryChars = settings.historyEntryChars ?? Number.MAX_SAFE_INTEGER;
  const lines: string[] = [];

  for (const entry of entries.slice(-maxEntries)) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const type = typeof record.type === "string" ? record.type : "entry";

    if (type === "custom_message") {
      // Do not feed previous curated injections back into the curator.
      if (record.customType === "claude-mem-curated-context") continue;
      continue;
    }
    if (type === "custom" || type === "label" || type === "session_info" || type === "model_change" || type === "thinking_level_change") {
      continue;
    }

    let role = type;
    let text = "";
    if (type === "message" && record.message && typeof record.message === "object") {
      const message = record.message as Record<string, unknown>;
      role = typeof message.role === "string" ? message.role : "message";
      if (role === "toolResult" || role === "tool" || role === "bash") continue;
      text = textFromUnknown(message.content ?? message.text);
    } else if (type === "compaction" || type === "branch_summary") {
      role = type;
      text = textFromUnknown(record.summary);
    } else {
      role = typeof record.role === "string" ? record.role : type;
      if (role === "toolResult" || role === "tool" || role === "bash") continue;
      text = textFromUnknown(record.content ?? record.message ?? record.text ?? record.data);
    }

    const trimmed = text.trim();
    if (!trimmed) continue;
    lines.push(`### ${role}\n${trimmed.length > maxEntryChars ? `${trimmed.slice(0, maxEntryChars)}…` : trimmed}`);
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
  const access = getCuratorSettings().access;
  const memoryTools = "mem_search,mem_timeline,mem_get_observations,mem_status";
  if (access === "memory") return memoryTools;
  return `read,grep,find,ls,${memoryTools}`;
}

function extraExtensionArgs(): string[] {
  return getCuratorSettings().extraExtensions.flatMap((entry) => ["-e", entry]);
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

function parentModelScopeArgs(): string[] {
  const models = argvValue("models")?.trim();
  return models ? ["--models", models] : [];
}

function modelRefFromContext(ctx: ExtensionContext): string | undefined {
  return ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : undefined;
}

function isCuratorThinkingLevel(value: string | undefined): value is CuratorThinkingLevel {
  return value === "off" || value === "minimal" || value === "low" || value === "medium" || value === "high" || value === "xhigh";
}

function currentThinkingLevel(ctx: ExtensionContext): CuratorThinkingLevel | undefined {
  try {
    const sessionContext = (ctx.sessionManager as any).buildSessionContext?.();
    if (isCuratorThinkingLevel(sessionContext?.thinkingLevel)) return sessionContext.thinkingLevel;
  } catch {
    // Fall back to scanning branch entries below.
  }

  try {
    const branch = ctx.sessionManager.getBranch?.() ?? [];
    for (let i = branch.length - 1; i >= 0; i--) {
      const entry = branch[i] as Record<string, unknown>;
      if (entry?.type === "thinking_level_change" && isCuratorThinkingLevel(String(entry.thinkingLevel))) {
        return entry.thinkingLevel as CuratorThinkingLevel;
      }
    }
  } catch {
    // Ignore and let the curator subprocess use Pi defaults.
  }

  return undefined;
}

function curatorModelArgs(ctx: ExtensionContext): string[] {
  const settings = getCuratorSettings();
  const args: string[] = [];

  if (settings.modelMode === "selected" && settings.selectedModelRef) {
    args.push("--model", settings.selectedModelRef);
  } else if (settings.modelMode === "current") {
    const current = modelRefFromContext(ctx);
    if (current) args.push("--model", current);
  } else {
    args.push(...parentModelScopeArgs());
  }

  if (settings.thinking === "inherit") {
    const level = currentThinkingLevel(ctx);
    if (level) args.push("--thinking", level);
  } else if (settings.thinking !== "auto") {
    args.push("--thinking", settings.thinking);
  }

  return args;
}

function textPreview(value: unknown, max = 500): string {
  const text = textFromUnknown(value).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function curatorPiSessionId(stdout: string): string | undefined {
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      if (event.type === "session" && typeof event.id === "string" && event.id.trim()) return event.id;
    } catch {
      // Ignore non-JSON lines.
    }
  }
  return undefined;
}

function summarizeToolTrace(stdout: string): CuratorToolCallSummary[] {
  const tools: CuratorToolCallSummary[] = [];
  const byId = new Map<string, CuratorToolCallSummary>();

  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event: Record<string, any>;
    try { event = JSON.parse(line); } catch { continue; }

    if (event.type === "tool_execution_start") {
      const name = String(event.toolName || "tool");
      const entry: CuratorToolCallSummary = { name, args: event.args ?? event.input };
      tools.push(entry);
      if (event.toolCallId) byId.set(String(event.toolCallId), entry);
      continue;
    }

    if (event.type === "message_update" && event.assistantMessageEvent?.type === "toolcall_start") {
      const call = event.assistantMessageEvent.toolCall;
      if (!call?.name) continue;
      const entry: CuratorToolCallSummary = { name: String(call.name), args: call.arguments };
      tools.push(entry);
      if (call.id) byId.set(String(call.id), entry);
      continue;
    }

    if (event.type === "message_end" && event.message?.role === "toolResult") {
      const id = event.message.toolCallId ? String(event.message.toolCallId) : undefined;
      const name = String(event.message.toolName || "tool");
      const entry = id ? byId.get(id) : undefined;
      const target = entry ?? { name };
      target.resultPreview = textPreview(event.message.content, 800);
      target.isError = Boolean(event.message.isError);
      if (!entry) tools.push(target);
    }
  }

  return tools;
}

function runCuratorPi(systemPrompt: string, prompt: string, ctx: ExtensionContext, timeoutMs: number, run: CuratorRunSummary): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const tempDir = mkdtempSync(join(tmpdir(), "claude-mem-pi-curator-"));
    const stdoutPath = join(tempDir, "stdout.txt");
    const stderrPath = join(tempDir, "stderr.txt");
    const systemPromptPath = join(tempDir, "system.md");
    const promptPath = join(tempDir, "prompt.md");
    const donePath = join(tempDir, "done");
    writeFileSync(stdoutPath, "", "utf8");
    writeFileSync(stderrPath, "", "utf8");
    writeFileSync(systemPromptPath, systemPrompt, "utf8");
    writeFileSync(promptPath, prompt, "utf8");
    const showPane = shouldOpenTmuxPane();
    if (showPane) openTmuxTailPane(stdoutPath, stderrPath, donePath);
    const args = [
      "--no-extensions",
      "-e", toolsOnlyExtensionPath,
      "--no-session",
      ...extraExtensionArgs(),
      ...curatorModelArgs(ctx),
      "--system-prompt", systemPromptPath,
      "--no-context-files",
      "--no-skills",
      "--no-builtin-tools",
      "--tools", curatorTools(),
      "--mode", "json",
      "-p", `@${promptPath}`,
    ];
    const command = `pi ${args.map(shellQuote).join(" ")}`;
    attachCuratorRunFiles(run, {
      systemPromptPath,
      promptPath,
      stdoutPath,
      stderrPath,
      donePath,
      command,
      systemPromptChars: systemPrompt.length,
      promptChars: prompt.length,
    });
    try {
      writeFileSync(
        stderrPath,
        `# spawned: ${command}\n# system prompt: ${systemPromptPath} (${systemPrompt.length} chars)\n# prompt: ${promptPath} (${prompt.length} chars)\n`,
        { encoding: "utf8", flag: "a" },
      );
    } catch {
      // Best-effort trace header only.
    }
    const stdoutFd = openSync(stdoutPath, "a");
    const stderrFd = openSync(stderrPath, "a");

    let settled = false;
    const cleanup = () => {
      try { closeSync(stdoutFd); } catch { /* ignore */ }
      try { closeSync(stderrFd); } catch { /* ignore */ }
      try { writeFileSync(donePath, "done", "utf8"); } catch { /* ignore */ }
      // Keep temp files for transparency. /curator last shows these paths and
      // users can inspect prompt/stdout/stderr after a run, even without tmux.
    };
    const readText = (path: string) => {
      try { return readFileSync(path, "utf8"); } catch { return ""; }
    };
    const readOutput = () => ({
      stdout: readText(stdoutPath),
      stderr: readText(stderrPath),
    });

    let child;
    try {
      child = spawn("pi", args, {
        cwd: ctx.cwd,
        env: {
          ...process.env,
          CLAUDE_MEM_PI_CURATOR_ACTIVE: "1",
          CLAUDE_MEM_INTERNAL_AGENT: "pi-curator",
        },
        stdio: ["ignore", stdoutFd, stderrFd],
      });
    } catch (error) {
      settled = true;
      const { stdout, stderr } = readOutput();
      finishCuratorRun(run, {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        stdoutBytes: stdout.length,
        stderrBytes: stderr.length,
        piSessionId: curatorPiSessionId(stdout),
        tools: summarizeToolTrace(stdout),
      });
      cleanup();
      reject(error);
      return;
    }

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      const { stdout, stderr } = readOutput();
      finishCuratorRun(run, {
        status: "timeout",
        error: `claude-mem curator timed out after ${timeoutMs}ms`,
        stdoutBytes: stdout.length,
        stderrBytes: stderr.length,
        piSessionId: curatorPiSessionId(stdout),
        tools: summarizeToolTrace(stdout),
      });
      cleanup();
      reject(new Error(`claude-mem curator timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const { stdout, stderr } = readOutput();
      finishCuratorRun(run, {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        stdoutBytes: stdout.length,
        stderrBytes: stderr.length,
        piSessionId: curatorPiSessionId(stdout),
        tools: summarizeToolTrace(stdout),
      });
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
        run.stdoutBytes = stdout.length;
        run.stderrBytes = stderr.length;
        run.piSessionId = curatorPiSessionId(stdout);
        run.tools = summarizeToolTrace(stdout);
        resolvePromise(stdout);
      } else {
        const error = `claude-mem curator exited ${code ?? "unknown"}: ${stderr || stdout}`.trim();
        finishCuratorRun(run, {
          status: "error",
          error,
          stdoutBytes: stdout.length,
          stderrBytes: stderr.length,
          piSessionId: curatorPiSessionId(stdout),
          tools: summarizeToolTrace(stdout),
        });
        reject(new Error(error));
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

  const timeoutMs = getCuratorSettings().timeoutMs || DEFAULT_CURATOR_TIMEOUT_MS;
  const systemPrompt = buildCuratorSystemPrompt(project);
  const prompt = buildCuratorPrompt({
    userPrompt,
    project,
    cwd: ctx.cwd,
    conversationHistory: formatConversationHistory(ctx),
  });

  const run = startCuratorRun(project, prompt);
  try {
    const stdout = await runCuratorPi(systemPrompt, prompt, ctx, timeoutMs, run);
    const curated = normalizeCuratorOutput(stdout);
    finishCuratorRun(run, {
      status: curated.empty ? "empty" : "injected",
      reason: curated.empty ? "curator returned empty context" : undefined,
      observationIds: curated.observationIds,
      contextChars: curated.context.length,
      contextPreview: textPreview(curated.context, 1000),
      stdoutBytes: run.stdoutBytes,
      stderrBytes: run.stderrBytes,
      piSessionId: run.piSessionId,
      tools: run.tools,
    });
    return curated;
  } catch (error) {
    if (run.status === "running") {
      finishCuratorRun(run, {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}
