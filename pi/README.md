# claude-mem for Pi

Native Pi integration for claude-mem. The integration is intentionally opt-in: normal `pi` should stay lean; load claude-mem only through the `pi-mem` / `pi-brain` aliases or an explicit `-e` flag.

## Recommended local aliases

`pi-mem` = Pi + claude-mem + MCP adapter.

```bash
pi -e /home/nixen/tools/claude-mem/pi/index.ts \
   -e /home/nixen/tools/pi/pi-mcp-adapter/index.ts "$@"
```

`pi-brain` = Pi + claude-mem + Open Brain + MCP adapter.

```bash
pi -e /home/nixen/tools/claude-mem/pi/index.ts \
   -e ~/.pi/extensions/openbrain/index.ts \
   -e /home/nixen/tools/pi/pi-mcp-adapter/index.ts "$@"
```

If you need a non-local path, replace the extension paths with your installed package locations.

## What the extension does

When loaded, `pi/index.ts` provides:

- Worker discovery/startup and status footer.
- Memory tools:
  - `mem_search`
  - `mem_timeline`
  - `mem_get_observations`
  - `mem_status`
- `/cmem` command for status and toggling context injection.
- Passive lifecycle capture:
  - `before_agent_start` → session init and project context injection.
  - `tool_result` → observation capture.
  - `agent_end` → session summary.
- Read-result augmentation for relevant file history.
- `session_compact` → refresh project facts after every Pi compaction.

There is no background curator/sub-agent in the default Pi integration. Context injection mirrors claude-mem for Claude Code: load project memory at conversation start and refresh it after compaction.

## Context injection behavior

- On the first agent turn in a session, claude-mem fetches `/api/context/inject` for the current project and injects it as a custom Pi message.
- After each `/compact` or auto-compaction, claude-mem injects a fresh project context message again.
- The injected custom message is stored in the Pi session and participates in LLM context.
- Repeated prompts do not reinject the same project context unless a later compaction happens.

Toggle injection without disabling capture:

```text
/cmem on
/cmem off
/cmem toggle
/cmem
```

Keyboard shortcuts:

```text
Ctrl+Alt+M
Ctrl+Shift+M
```

Footer status:

```text
mem: on
mem: off
```

## MCP adapter

Use `pi-mcp-adapter` in the aliases when you want Pi MCP access. The adapter reads `~/.pi/agent/mcp.json` by default. A minimal claude-mem MCP entry can point at:

```text
/home/nixen/tools/claude-mem/plugin/scripts/mcp-server.cjs
```

The claude-mem native Pi tools are still the preferred memory search surface, but the MCP server remains available for workflows that expect MCP.

## Explicit one-off loading

Development run from this repository:

```bash
pi -e ./pi/index.ts
```

One-shot prompt:

```bash
pi -e ./pi/index.ts -p "your task"
```

Tools-only memory search without lifecycle capture:

```bash
pi -e ./pi/tools-only.ts --no-builtin-tools --tools mem_search,mem_timeline,mem_get_observations,mem_status
```

## Files

| File | Purpose |
| --- | --- |
| `pi/index.ts` | Full explicit extension: tools, lifecycle, status, shortcuts. |
| `pi/tools-only.ts` | Tools-only extension. No lifecycle hooks. |
| `pi/capture.ts` | Session init, project context injection, observation capture, summarize, read augmentation. |
| `pi/tools.ts` | Pi memory tools plus `/cmem`. |
| `pi/state.ts` | In-memory injection on/off state and footer status. |
| `pi/client.ts` | Worker port discovery, health/readiness, autostart, HTTP requests. |
| `pi/project.ts` | Project root/name resolution. |
| `pi/session.ts` | Pi session ID and assistant text helpers. |
| `pi/skills/mem-search/SKILL.md` | Pi skill for progressive memory search. |

## Testing

Basic import smoke:

```bash
bun -e 'import("./pi/index.ts").then(()=>import("./pi/tools-only.ts")).then(()=>console.log("ok"))'
```

Build/package checks:

```bash
npm run build
git diff --check
npm pack --dry-run --json
```
