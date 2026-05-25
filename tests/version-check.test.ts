import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { spawnSync } from 'child_process';
import { join } from 'path';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('plugin/scripts/version-check.js', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), 'version-check-test-' + Date.now());
    mkdirSync(tempDir);
    // Create package.json with version
    writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ version: '1.0.0' }));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('accepts legacy plain-text version marker', () => {
    writeFileSync(join(tempDir, '.install-version'), '1.0.0\n');

    const result = spawnSync('node', ['plugin/scripts/version-check.js'], {
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: tempDir },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
