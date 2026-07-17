import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '../..');

describe('personal fork sync workflow', () => {
  test('keeps develop checked out so branch-only pi/ never disappears', () => {
    const script = readFileSync(resolve(root, 'scripts/sync-personal-fork.sh'), 'utf8');
    expect(script).toContain('git update-ref refs/heads/main');
    expect(script).toContain('git -c core.hooksPath=/dev/null rebase main');
    expect(script).not.toMatch(/git\s+(checkout|switch)\s+main/);
  });

  test('never pushes to upstream and keeps main updates non-forcing', () => {
    const script = readFileSync(resolve(root, 'scripts/sync-personal-fork.sh'), 'utf8');
    expect(script).not.toMatch(/git\s+push\s+upstream/);
    expect(script).toContain('git push origin main:main');
    expect(script).not.toMatch(/git\s+push\s+--force\S*\s+origin\s+main:main/);
  });

  test('documents the stable sync entry point in CLAUDE.md', () => {
    const instructions = readFileSync(resolve(root, 'CLAUDE.md'), 'utf8');
    expect(instructions).toContain('scripts/sync-personal-fork.sh');
    expect(instructions).toContain('never checks out `main`');
  });
});
