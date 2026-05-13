# claude-mem for Pi

Native Pi integration for claude-mem. The integration is intentionally **explicit opt-in**: claude-mem does not change normal Pi behavior unless you load the extension for a run.

## Quick start

From this repository during development:

```bash
pi --no-extensions -e /home/nixen/tools/claude-mem
```

or load the extension file directly:

```bash
pi --no-extensions -e /home/nixen/tools/claude-mem/pi/index.ts
```

For a one-shot prompt:

```bash
pi --no-extensions -e /home/nixen/tools/claude-mem -p "your task"
```

`--no-extensions` is recommended when you want to make the opt-in explicit and avoid unrelated installed extensions.

## What the extension does

When explicitly loaded, the full extension (`pi/index.ts`) provides:

- Worker discovery/startup and status footer.
- Memory tools:
  - `mem_search`
  - `mem_timeline`
  - `mem_get_observations`
  - `mem_status`
- `/cmem` command.
- `/curator` command/menu for curator flags, model, and thinking level.
- Passive lifecycle capture:
  - `before_agent_start` → session init and curated context injection.
  - `tool_result` → observation capture.
  - `agent_end` → session summary.
- Read-result augmentation for relevant file history.
- Background scout/memory curator before the main agent starts work.

## Explicit opt-in architecture

The package keeps a Pi manifest so a package root can be loaded:

```bash
pi -e /path/to/claude-mem
```

But the recommended mode is still explicit per run. If you do not load the extension with `-e/--extension`, Pi runs normally without claude-mem lifecycle hooks.

## Background curator

Before the main agent starts, `pi/capture.ts` calls the curator in `pi/curator.ts`.

The curator is a separate Pi subprocess launched with the tools-only extension:

```bash
pi --no-extensions \
  -e ./pi/tools-only.ts \
  --no-session \
  --no-context-files \
  --no-skills \
  --no-builtin-tools \
  --tools read,grep,find,ls,mem_search,mem_timeline,mem_get_observations,mem_status \
  [--model provider/model] \
  [--thinking level] \
  -p "<curator prompt>"
```

This avoids recursion: the curator does **not** load the full claude-mem lifecycle extension.

### Curator responsibilities

The curator is a scout + memory agent. It receives:

- the current user prompt,
- the current project/cwd,
- the current conversation history injected by the parent extension,
- read-only project tools,
- claude-mem memory tools.

It must return JSON containing either an empty result or a markdown context block:

```json
{
  "empty": false,
  "context": "## claude-mem curated task context\n\n- [#123] verified fact...",
  "observationIds": [123]
}
```

The main agent receives the `context` as a custom Pi message with type:

```text
claude-mem-curated-context
```

### Curator access levels

Default access is read-only research mode:

```bash
CLAUDE_MEM_PI_CURATOR_ACCESS=readonly
```

Tools:

```text
read, grep, find, ls, mem_search, mem_timeline, mem_get_observations, mem_status
```

Memory-only mode:

```bash
CLAUDE_MEM_PI_CURATOR_ACCESS=memory
```

Tools:

```text
mem_search, mem_timeline, mem_get_observations, mem_status
```

The curator is intentionally not given `bash`, `edit`, or `write`.

### Curator model and thinking

Current behavior is explicit and configurable:

- `model: auto` — default. The curator subprocess lets Pi choose its model normally; if the parent Pi was started with `--models`, that scope is passed through.
- `model: current` — inherit the main Pi session's currently selected model.
- `model: provider/model` — use an explicit model.

Thinking supports:

```text
auto | inherit | off | minimal | low | medium | high | xhigh
```

Use the menu:

```text
/curator
```

Useful direct commands:

```text
/curator status
/curator model auto
/curator model current
/curator model anthropic/claude-sonnet-4-5
/curator thinking inherit
/curator thinking high
/curator access readonly
/curator timeout 180000
/curator tmux on
```

The model picker in `/curator` lists Pi-scoped models from `--models` or `enabledModels` settings when available, with all configured available models as fallback.

### Extra curator extensions / MCP

Additional Pi extensions can be loaded into the curator subprocess with:

```bash
CLAUDE_MEM_PI_CURATOR_EXTRA_EXTENSIONS=/path/to/ext1.ts,/path/to/ext2.ts
```

Use this for read-only MCP adapters or other trusted data-source extensions. Avoid loading the full claude-mem lifecycle extension here, otherwise recursion may occur.

## Conversation history injection

The parent extension injects conversation history directly into the curator prompt using `ctx.sessionManager.getEntries()`.

By default the curator receives a bounded recent history slice to avoid overflowing the subprocess model context:

```bash
CLAUDE_MEM_PI_CURATOR_HISTORY_ENTRIES=30
CLAUDE_MEM_PI_CURATOR_HISTORY_CHARS=20000
CLAUDE_MEM_PI_CURATOR_HISTORY_ENTRY_CHARS=3000
```

Set a value to `unlimited` only for short sessions where you explicitly want full history.

## Toggle memory injection

The extension can capture memory while disabling context injection.

Keyboard shortcut:

```text
Ctrl+Alt+M
```

`Ctrl+Shift+M` is also registered, but many terminals/tmux setups cannot distinguish it reliably.

Slash commands:

```text
/cmem on
/cmem off
/cmem toggle
/cmem
/curator
/curator status
```

`/cmem` with no arguments shows worker status and whether context injection is on/off.
`/curator` opens the curator configuration menu in interactive mode; in non-interactive mode use `/curator status` or direct subcommands.

Footer status:

```text
mem: on
mem: off
curator: working
```

## Curator tmux observability

To open a read-only tmux pane showing curator stdout/stderr:

```bash
CLAUDE_MEM_PI_CURATOR_TMUX_PANE=1 \
CLAUDE_MEM_PI_CURATOR_TMUX_KEEP_SECONDS=20 \
pi --no-extensions -e /home/nixen/tools/claude-mem -p "your task"
```

Optional target:

```bash
CLAUDE_MEM_PI_CURATOR_TMUX_TARGET=brain:claude-mem
```

The pane tails temp files like:

```text
/tmp/claude-mem-pi-curator-*/stdout.txt
/tmp/claude-mem-pi-curator-*/stderr.txt
```

It is a log viewer, not an interactive agent TUI. It shows final JSON and stderr warnings, not a full live Pi conversation transcript.

## Environment reference

| Variable | Default | Description |
| --- | --- | --- |
| `CLAUDE_MEM_PI_CURATOR_ACCESS` | `readonly` | `readonly` or `memory`. |
| `CLAUDE_MEM_PI_CURATOR_MODEL` | `auto` | `auto`, `current`, or explicit `provider/model`. |
| `CLAUDE_MEM_PI_CURATOR_THINKING` | `auto` | `auto`, `inherit`, `off`, `minimal`, `low`, `medium`, `high`, `xhigh`. |
| `CLAUDE_MEM_PI_CURATOR_EXTRA_EXTENSIONS` | empty | Comma-separated extra extension paths for curator. |
| `CLAUDE_MEM_PI_CURATOR_TIMEOUT_MS` | `120000` | Curator subprocess timeout. |
| `CLAUDE_MEM_PI_CURATOR_HISTORY_ENTRIES` | `30` | Max session entries injected into curator prompt; set `unlimited` to disable. |
| `CLAUDE_MEM_PI_CURATOR_HISTORY_CHARS` | `20000` | Max total injected history characters; set `unlimited` to disable. |
| `CLAUDE_MEM_PI_CURATOR_HISTORY_ENTRY_CHARS` | `3000` | Max characters per injected entry; set `unlimited` to disable. |
| `CLAUDE_MEM_PI_CURATOR_TMUX_PANE` | off | Set `1` to open a tmux log pane. |
| `CLAUDE_MEM_PI_CURATOR_TMUX_TARGET` | `brain:claude-mem` | tmux target for log pane. |
| `CLAUDE_MEM_PI_CURATOR_TMUX_KEEP_SECONDS` | `20` | Seconds to keep pane open after curator finishes. |
| `CLAUDE_MEM_PI_DEBUG` | off | Show debug warnings in Pi UI. |

Equivalent Pi CLI extension flags are also registered:

```text
--cmem-curator-access <readonly|memory>
--cmem-curator-model <auto|current|provider/model>
--cmem-curator-thinking <auto|inherit|off|minimal|low|medium|high|xhigh>
--cmem-curator-timeout-ms <ms>
--cmem-curator-tmux-pane
--cmem-curator-tmux-target <target>
--cmem-curator-tmux-keep-seconds <seconds>
--cmem-curator-extra-extensions <csv>
--cmem-curator-history-entries <n|unlimited>
--cmem-curator-history-chars <n|unlimited>
--cmem-curator-history-entry-chars <n|unlimited>
```

## Files

| File | Purpose |
| --- | --- |
| `pi/index.ts` | Full explicit extension: tools, lifecycle, status, shortcuts. |
| `pi/tools-only.ts` | Curator-safe tools-only extension. No lifecycle hooks. |
| `pi/curator.ts` | Background scout/memory curator runner and prompt. |
| `pi/capture.ts` | Session init, curated injection, observation capture, summarize, read augmentation. |
| `pi/tools.ts` | Pi memory tools plus `/cmem` and `/curator`. |
| `pi/state.ts` | In-memory injection on/off state, curator settings, and footer status. |
| `pi/client.ts` | Worker port discovery, health/readiness, autostart, HTTP requests. |
| `pi/project.ts` | Project root/name resolution. |
| `pi/session.ts` | Pi session ID and assistant text helpers. |
| `pi/skills/mem-search/SKILL.md` | Pi skill for progressive memory search. |

## Testing

Basic import smoke:

```bash
bun -e 'import("./pi/index.ts").then(()=>import("./pi/tools-only.ts")).then(()=>import("./pi/curator.ts")).then(()=>console.log("ok"))'
```

Explicit extension load:

```bash
pi --no-extensions -e ./pi/index.ts --offline --no-session --no-skills --no-context-files -p "load test"
```

Tools-only load:

```bash
pi --no-extensions -e ./pi/tools-only.ts --offline --no-session --no-skills --no-context-files --no-builtin-tools --tools mem_status -p "status"
```

Curator with tmux pane:

```bash
CLAUDE_MEM_PI_CURATOR_TMUX_PANE=1 \
CLAUDE_MEM_PI_CURATOR_TMUX_KEEP_SECONDS=20 \
pi --no-extensions -e ./pi/index.ts -p "test curator"
```

Build/package checks:

```bash
npm run build
git diff --check
npm pack --dry-run --json
```

## Notes and limitations

- Curator tmux pane currently tails stdout/stderr only; it is not a full interactive Pi UI.
- Full transcript-style curator viewing would require saving and pretty-printing a curator session JSONL instead of using `--no-session`.
- `Ctrl+Shift+M` may not work in many terminal/tmux setups; use `Ctrl+Alt+M` or `/cmem toggle`.
- Curator can be expensive/slow if unlimited conversation history is large. Use history env limits if needed.
- The curator intentionally has no write access.
