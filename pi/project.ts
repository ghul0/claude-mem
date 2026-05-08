import { execFileSync } from "node:child_process";
import { basename, resolve } from "node:path";

export interface ProjectInfo {
  cwd: string;
  root: string;
  name: string;
}

export function resolveProjectRoot(cwd: string): string {
  const absoluteCwd = resolve(cwd);
  try {
    const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: absoluteCwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return root || absoluteCwd;
  } catch {
    return absoluteCwd;
  }
}

export function getProjectInfo(cwd: string): ProjectInfo {
  const root = resolveProjectRoot(cwd);
  return {
    cwd: resolve(cwd),
    root,
    name: basename(root),
  };
}
