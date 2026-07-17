
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { homedir } from 'os';
import { getProjectName, getProjectContext } from '../../src/utils/project-name.js';

describe('getProjectName', () => {
  describe('tilde expansion', () => {
    it('resolves bare ~ to the canonical absolute home identifier', () => {
      expect(getProjectName('~')).toBe(homedir());
    });

    it('resolves ~/subpath to an absolute identifier', () => {
      expect(getProjectName('~/projects/my-app')).toBe(`${homedir()}/projects/my-app`);
    });

    it('normalizes the trailing slash from ~/', () => {
      expect(getProjectName('~/')).toBe(homedir());
    });
  });

  describe('normal paths', () => {
    it('keeps the full absolute path as the project identifier', () => {
      expect(getProjectName('/home/user/my-project')).toBe('/home/user/my-project');
    });

    it('does not collapse nested paths with the same basename', () => {
      expect(getProjectName('/Users/test/work/deep/nested/project')).toBe('/Users/test/work/deep/nested/project');
    });

    it('normalizes a trailing slash', () => {
      expect(getProjectName('/home/user/my-project/')).toBe('/home/user/my-project');
    });
  });

  describe('edge cases', () => {
    it('returns unknown-project for null', () => {
      expect(getProjectName(null)).toBe('unknown-project');
    });

    it('returns unknown-project for undefined', () => {
      expect(getProjectName(undefined)).toBe('unknown-project');
    });

    it('returns unknown-project for empty string', () => {
      expect(getProjectName('')).toBe('unknown-project');
    });

    it('returns unknown-project for whitespace', () => {
      expect(getProjectName('   ')).toBe('unknown-project');
    });
  });

  describe('absolute project identifier contract', () => {
    let tmp: string;
    let repoRoot: string;
    let nestedDir: string;

    beforeAll(async () => {
      const { mkdtempSync, mkdirSync, realpathSync } = await import('fs');
      const { execFileSync } = await import('child_process');
      const { join } = await import('path');
      const { tmpdir } = await import('os');

      // macOS /tmp symlinks to /private/tmp; realpath so `git --show-toplevel`
      // (which returns the canonical path) matches our expectations.
      tmp = realpathSync(mkdtempSync(join(tmpdir(), 'cm-reporoot-')));
      repoRoot = join(tmp, 'my-real-repo');
      nestedDir = join(repoRoot, 'packages', 'deeply', 'nested');
      mkdirSync(nestedDir, { recursive: true });
      execFileSync('git', ['init', '-q'], { cwd: repoRoot });
    });

    afterAll(async () => {
      const { rmSync } = await import('fs');
      rmSync(tmp, { recursive: true, force: true });
    });

    it('keeps a deep repository cwd distinct from its root', () => {
      expect(getProjectName(nestedDir)).toBe(nestedDir);
    });

    it('uses the repository root path when that is the cwd', () => {
      expect(getProjectName(repoRoot)).toBe(repoRoot);
    });

    it('keeps a non-repository absolute path without filesystem probing', () => {
      expect(getProjectName('/no/such/dir/standalone-folder')).toBe('/no/such/dir/standalone-folder');
    });
  });

  describe('realistic scenarios from #1478', () => {
    it('handles ~ the same as full home path', () => {
      const home = homedir();
      expect(getProjectName('~')).toBe(getProjectName(home));
    });

    it('handles ~/projects/app the same as /full/path/projects/app', () => {
      const home = homedir();
      expect(getProjectName('~/projects/app')).toBe(
        getProjectName(`${home}/projects/app`)
      );
    });
  });
});

describe('getProjectContext', () => {
  it('returns the absolute identifier for a normal path', () => {
    const ctx = getProjectContext('/home/user/my-project');
    expect(ctx.primary).toBe('/home/user/my-project');
    expect(ctx.parent).toBeNull();
    expect(ctx.isWorktree).toBe(false);
    expect(ctx.allProjects).toEqual(['/home/user/my-project']);
  });

  it('resolves ~ path correctly', () => {
    const home = homedir();
    const ctx = getProjectContext('~');
    const ctxHome = getProjectContext(home);
    expect(ctx.primary).toBe(ctxHome.primary);
  });

  it('returns unknown-project context for null', () => {
    const ctx = getProjectContext(null);
    expect(ctx.primary).toBe('unknown-project');
    expect(ctx.parent).toBeNull();
  });

  describe('worktree isolation', () => {
    let tmp: string;
    let mainRepo: string;
    let worktreeCheckout: string;

    beforeAll(async () => {
      const { mkdtempSync, mkdirSync, writeFileSync } = await import('fs');
      const { join } = await import('path');
      const { tmpdir } = await import('os');

      tmp = mkdtempSync(join(tmpdir(), 'cm-wt-'));
      mainRepo = join(tmp, 'main-repo');
      const worktreeGitDir = join(mainRepo, '.git', 'worktrees', 'my-worktree');
      worktreeCheckout = join(tmp, 'my-worktree');

      mkdirSync(worktreeGitDir, { recursive: true });
      mkdirSync(worktreeCheckout, { recursive: true });
      writeFileSync(
        join(worktreeCheckout, '.git'),
        `gitdir: ${worktreeGitDir}\n`
      );
    });

    afterAll(async () => {
      const { rmSync } = await import('fs');
      rmSync(tmp, { recursive: true, force: true });
    });

    it('keeps the worktree checkout path as the primary identifier', () => {
      const ctx = getProjectContext(worktreeCheckout);
      expect(ctx.isWorktree).toBe(true);
      expect(ctx.primary).toBe(worktreeCheckout);
      expect(ctx.parent).toBe('main-repo');
      expect(ctx.allProjects).toEqual([worktreeCheckout]);
    });

    it('write-path call sites remain isolated by absolute worktree path', () => {
      const project = getProjectContext(worktreeCheckout).primary;
      expect(project).toBe(worktreeCheckout);
      expect(project).not.toBe(mainRepo);
      expect(project).not.toBe('my-worktree');
    });
  });
});
