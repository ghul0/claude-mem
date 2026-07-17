#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

branch="$(git branch --show-current)"
if [[ "$branch" != "develop" ]]; then
  printf 'sync-personal-fork: expected develop, found %s\n' "${branch:-detached HEAD}" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  printf 'sync-personal-fork: working tree must be clean before rebase\n' >&2
  exit 1
fi

git fetch upstream --tags
git fetch origin

local_main="$(git rev-parse refs/heads/main)"
upstream_main="$(git rev-parse refs/remotes/upstream/main)"
if [[ "$local_main" != "$upstream_main" ]] && ! git merge-base --is-ancestor "$local_main" "$upstream_main"; then
  printf 'sync-personal-fork: local main diverged from upstream/main; refusing to move it\n' >&2
  exit 1
fi

# Move the local mirror atomically without checking it out. upstream/main has no
# pi/ directory, so keeping develop checked out prevents pi-brain imports from
# disappearing during routine sync. update-ref itself does not run checkout or
# rewrite hooks.
git update-ref refs/heads/main "$upstream_main" "$local_main"

# This is deliberately a normal push. Unexpected origin/main divergence must
# reject rather than be overwritten.
git push origin main:main

before_rebase="$(git rev-parse HEAD)"
# Local post-rewrite hooks build branch-dependent artifacts in the source tree.
# Disable them for the rebase; release artifacts are built later in a clean
# clone/worktree under the same no-hooks rule.
git -c core.hooksPath=/dev/null rebase main
after_rebase="$(git rev-parse HEAD)"

if [[ "$before_rebase" != "$after_rebase" ]]; then
  git push --force-with-lease origin develop
elif [[ "$(git rev-parse refs/remotes/origin/develop)" != "$after_rebase" ]]; then
  git push origin develop
fi

printf 'sync-personal-fork: develop=%s main=%s\n' "$after_rebase" "$upstream_main"
