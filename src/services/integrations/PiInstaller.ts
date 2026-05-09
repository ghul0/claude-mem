import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { IS_WINDOWS } from '../../npx-cli/utils/paths.js';

export interface PiInstallOptions {
  version?: string;
  packageSpec?: string;
}

export interface PiInstallResult {
  result: number;
  output: string;
}

function commandExists(command: string): boolean {
  try {
    execSync(`${IS_WINDOWS ? 'where' : 'which'} ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function isPiAvailable(): boolean {
  return commandExists('pi') || existsSync(join(homedir(), '.pi', 'agent'));
}

export function resolvePiPackageSpec(options: PiInstallOptions = {}): string {
  if (options.packageSpec?.trim()) return options.packageSpec.trim();
  if (process.env.CLAUDE_MEM_PI_PACKAGE_SPEC?.trim()) {
    return process.env.CLAUDE_MEM_PI_PACKAGE_SPEC.trim();
  }
  return options.version?.trim()
    ? `npm:claude-mem@${options.version.trim()}`
    : 'npm:claude-mem';
}

export function installPiIntegration(options: PiInstallOptions = {}): PiInstallResult {
  if (!commandExists('pi')) {
    return {
      result: 1,
      output: 'Pi CLI not found in PATH. Install Pi first, then run: pi install npm:claude-mem',
    };
  }

  const packageSpec = resolvePiPackageSpec(options);
  try {
    const output = execSync(`pi install ${JSON.stringify(packageSpec)}`, {
      stdio: 'pipe',
      encoding: 'utf8',
      ...(IS_WINDOWS ? { shell: process.env.ComSpec ?? 'cmd.exe' } : {}),
    });
    return { result: 0, output };
  } catch (error: unknown) {
    const e = error as { status?: number; stdout?: string | Buffer; stderr?: string | Buffer; message?: string };
    const stdout = e.stdout ? e.stdout.toString() : '';
    const stderr = e.stderr ? e.stderr.toString() : '';
    return {
      result: typeof e.status === 'number' ? e.status : 1,
      output: [stdout, stderr, e.message ?? ''].filter(Boolean).join('\n'),
    };
  }
}
