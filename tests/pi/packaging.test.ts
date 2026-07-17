import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dir, '../..');

describe('Pi package distribution', () => {
  test('declares the native extension and skill as Pi package resources', () => {
    const packageJson = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
    expect(packageJson.keywords).toContain('pi-package');
    expect(packageJson.pi).toEqual({
      extensions: ['./pi/index.ts'],
      skills: ['./pi/skills'],
    });
    expect(packageJson.peerDependencies).toMatchObject({
      '@earendil-works/pi-coding-agent': '*',
    });
  });

  test('ships every native Pi runtime module in the npm tarball', () => {
    const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    const packed = JSON.parse(result.stdout);
    const paths = new Set<string>(packed[0].files.map((file: { path: string }) => file.path));
    for (const path of [
      'pi/index.ts',
      'pi/tools-only.ts',
      'pi/client.ts',
      'pi/capture.ts',
      'pi/tools.ts',
      'pi/state.ts',
      'pi/project.ts',
      'pi/session.ts',
      'pi/format.ts',
      'pi/skills/mem-search/SKILL.md',
      'plugin/scripts/worker-service.cjs',
    ]) {
      expect(paths.has(path)).toBe(true);
    }
  });
});
