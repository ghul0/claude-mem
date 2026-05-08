# Claude-Mem: AI Development Instructions

Claude-mem is a Claude Code plugin providing persistent memory across sessions. It captures tool usage, compresses observations using the Claude Agent SDK, and injects relevant context into future sessions.

## Build

```bash
npm run build-and-sync        # Build, sync to marketplace, restart worker
```

## File Locations

- **Source**: `<project-root>/src/`
- **Built Plugin**: `<project-root>/plugin/`
- **Installed Plugin**: `~/.claude/plugins/marketplaces/thedotmack/`
- **Database**: `~/.claude-mem/claude-mem.db`
- **Chroma**: `~/.claude-mem/chroma/`

## Requirements

- **Bun** (all platforms - auto-installed if missing)
- **uv** (all platforms - auto-installed if missing, provides Python for Chroma)
- Node.js

## Documentation

**Public Docs**: https://docs.claude-mem.ai (Mintlify)
**Source**: `docs/public/` - MDX files, edit `docs.json` for navigation
**Deploy**: Auto-deploys from GitHub on push to main

## Important

No need to edit the changelog ever, it's generated automatically.

## Daily Maintenance

Run a daily version check across all package manifests and upgrade every dependency to its latest version — including major version bumps. Staying on the latest is the goal; do not skip majors.

- Check `package.json` (root) and all nested `package.json` files (e.g. `plugin/`, `openclaw/`) for outdated dependencies via `npm outdated`.
- Upgrade every package to `latest` (use `npm install <pkg>@latest` for each, or `npx npm-check-updates -u && npm install`). Bump majors too.
- Run `npm audit fix` to resolve advisories.
- After upgrades, run `npm run build-and-sync` and verify the worker starts and tests pass. Fix any breakage caused by major bumps in the same change.
- Commit the updated `package.json` and `package-lock.json` files.

## Personal Fork Workflow

This repository is a personal fork at `github.com/ghul0/claude-mem`. The original ("upstream") is `github.com/thedotmack/claude-mem`.

**Remotes:**
- `origin` → `git@github.com:ghul0/claude-mem.git` (fork; push + pull)
- `upstream` → `https://github.com/thedotmack/claude-mem.git` (original; read-only — never push)

**Branches:**
- `main` — clean mirror of `upstream/main`. Never commit here directly; only fast-forward from upstream.
- `develop` — working branch for local modifications. Always rebase on top of fresh `main`.
- `legacy` — frozen snapshot of pre-fork-restructure work (per-agent partitioning, `e6fbe491`). Reference only; cherry-pick from here if needed.

### Session-start sync (run at the beginning of every session)

Before doing any work, sync `main` with upstream and rebase `develop` on top:

```bash
git fetch upstream --tags
git checkout main
git merge --ff-only upstream/main      # always FF; main has no local commits
git push origin main                    # back up the synced main to the fork
git checkout develop
git rebase main                         # replay develop commits on top of new main
git push --force-with-lease origin develop  # only if rebase moved commits
```

If `git merge --ff-only upstream/main` fails, `main` has diverged — investigate before forcing anything.

### Daily work

All local modifications happen on `develop` (or short-lived `feat/*` branches off `develop`). Never commit to `main`.

```bash
git checkout develop
# ...edits + commits...
git push origin develop
```

### Cherry-picking from legacy

```bash
git checkout develop
git cherry-pick e6fbe491   # specific commit
# or: git merge legacy     # merge whole legacy branch
```
