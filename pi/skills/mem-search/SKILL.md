---
name: mem-search
description: Search claude-mem's persistent cross-session memory database from Pi. Use when the user asks about previous sessions, prior fixes, historical decisions, or "did we already solve this?".
---

# Memory Search for Pi

Search past work across Pi and other claude-mem-enabled sessions. Follow the progressive workflow below to avoid loading too much memory.

## When to Use

Use this skill when the user asks about previous work, for example:

- "Did we already fix this?"
- "How did we solve X last time?"
- "What changed last week?"
- "Find the old decision about this architecture."

## Workflow

Always search first, inspect timeline context second, and fetch full observations only after filtering IDs.

### 1. Search index IDs

Use `mem_search`:

```text
mem_search(query="authentication", limit=20, project="my-project")
```

Useful parameters:

- `query` — search terms
- `limit` — max results, default 20
- `project` — project filter
- `type` — `observations`, `sessions`, or `prompts`
- `obs_type` — comma-separated `bugfix`, `feature`, `decision`, `discovery`, `change`
- `dateStart`, `dateEnd` — `YYYY-MM-DD` or epoch milliseconds
- `offset` — pagination offset
- `orderBy` — `date_desc`, `date_asc`, or `relevance`

### 2. Expand context around promising hits

Use `mem_timeline` with an anchor ID:

```text
mem_timeline(anchor=11131, depth_before=3, depth_after=3, project="my-project")
```

Or let claude-mem choose an anchor from a query:

```text
mem_timeline(query="authentication", depth_before=3, depth_after=3, project="my-project")
```

### 3. Fetch full observations only for selected IDs

Use `mem_get_observations` after filtering:

```text
mem_get_observations(ids=[11131, 10942], orderBy="date_desc")
```

Prefer batching multiple IDs in one call instead of fetching one at a time.

## Important

- Do not fetch full observations until search/timeline results have been filtered.
- If a memory tool reports the worker is unavailable, use `mem_status` and tell the user to run `npx claude-mem repair` if needed.
- This Pi skill uses Pi tools: `mem_search`, `mem_timeline`, `mem_get_observations`, and `mem_status`.
