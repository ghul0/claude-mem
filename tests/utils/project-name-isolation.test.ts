import { describe, it, expect } from 'bun:test';
import { getProjectName } from '../../src/utils/project-name.js';

describe('getProjectName mock isolation (#1299)', () => {
  it('returns the real absolute identifier, not the leaked test-project mock', () => {
    expect(getProjectName('/real/path/to/my-project')).toBe('/real/path/to/my-project');
  });

  it('returns unknown-project for empty string (real implementation)', () => {
    expect(getProjectName('')).toBe('unknown-project');
  });

  it('returns the real absolute identifier from a nested path', () => {
    expect(getProjectName('/home/user/code/awesome-app')).toBe('/home/user/code/awesome-app');
  });
});
