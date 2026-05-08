import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface WorkerEndpoint {
  port: number;
  host: string;
  baseUrl: string;
  dataDir: string;
  settingsPath: string;
}

export interface WorkerStartAttempt {
  attempted: boolean;
  ok: boolean;
  runtimePath?: string;
  scriptPath?: string;
  stdout?: string;
  stderr?: string;
  message?: string;
}

export interface WorkerHealthStatus extends WorkerEndpoint {
  healthOk: boolean;
  readinessOk: boolean;
  ready: boolean;
  message?: string;
  health?: unknown;
  readiness?: unknown;
  start?: WorkerStartAttempt;
}

export class WorkerUnavailableError extends Error {
  constructor(message = "claude-mem worker unavailable. Run: npx claude-mem repair") {
    super(message);
    this.name = "WorkerUnavailableError";
  }
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_WORKER_START_TIMEOUT_MS = 15_000;
const DEFAULT_READINESS_WAIT_MS = 10_000;
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function defaultWorkerPort(): number {
  return 37700 + ((process.getuid?.() ?? 77) % 100);
}

function parsePort(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) return undefined;
  return parsed;
}

function normalizeSettings(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  if (record.env && typeof record.env === "object" && !Array.isArray(record.env)) {
    return record.env as Record<string, unknown>;
  }
  return record;
}

function readSettings(settingsPath: string): Record<string, unknown> {
  if (!existsSync(settingsPath)) return {};
  try {
    return normalizeSettings(JSON.parse(readFileSync(settingsPath, "utf8")));
  } catch {
    return {};
  }
}

function resolveDataDir(): string {
  if (process.env.CLAUDE_MEM_DATA_DIR?.trim()) {
    return process.env.CLAUDE_MEM_DATA_DIR.trim();
  }

  const defaultDataDir = join(homedir(), ".claude-mem");
  const defaultSettings = readSettings(join(defaultDataDir, "settings.json"));
  const configuredDataDir = defaultSettings.CLAUDE_MEM_DATA_DIR;
  return typeof configuredDataDir === "string" && configuredDataDir.trim()
    ? configuredDataDir.trim()
    : defaultDataDir;
}

export function resolveWorkerEndpoint(): WorkerEndpoint {
  const dataDir = resolveDataDir();
  const settingsPath = join(dataDir, "settings.json");
  const settings = readSettings(settingsPath);

  const port =
    parsePort(process.env.CLAUDE_MEM_WORKER_PORT) ??
    parsePort(settings.CLAUDE_MEM_WORKER_PORT) ??
    defaultWorkerPort();

  const host =
    typeof process.env.CLAUDE_MEM_WORKER_HOST === "string" && process.env.CLAUDE_MEM_WORKER_HOST.trim()
      ? process.env.CLAUDE_MEM_WORKER_HOST.trim()
      : typeof settings.CLAUDE_MEM_WORKER_HOST === "string" && settings.CLAUDE_MEM_WORKER_HOST.trim()
        ? settings.CLAUDE_MEM_WORKER_HOST.trim()
        : DEFAULT_HOST;

  return {
    port,
    host,
    baseUrl: `http://${host}:${port}`,
    dataDir,
    settingsPath,
  };
}

function resolveWorkerScriptPath(): string | undefined {
  const candidates = [
    join(packageRoot, "plugin", "scripts", "worker-service.cjs"),
    join(process.cwd(), "plugin", "scripts", "worker-service.cjs"),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

function isBunExecutablePath(candidate: string | undefined): boolean {
  return Boolean(candidate && /(^|[\\/])bun(\.exe)?$/i.test(candidate.trim()));
}

function resolveBunRuntime(): string | undefined {
  const directCandidates = [
    process.env.BUN,
    process.env.BUN_PATH,
    join(homedir(), ".bun", "bin", process.platform === "win32" ? "bun.exe" : "bun"),
    "/usr/local/bin/bun",
    "/opt/homebrew/bin/bun",
    "/home/linuxbrew/.linuxbrew/bin/bun",
    "/usr/bin/bun",
    "/snap/bin/bun",
  ];

  if (isBunExecutablePath(process.execPath)) return process.execPath;

  for (const candidate of directCandidates) {
    const normalized = candidate?.trim();
    if (!normalized) continue;
    if (normalized.toLowerCase() === "bun") return normalized;
    if (isBunExecutablePath(normalized) && existsSync(normalized)) return normalized;
  }

  try {
    const command = process.platform === "win32" ? "where" : "which";
    const output = execFileSync(command, ["bun"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
  } catch {
    return undefined;
  }
}

async function fetchJson(url: URL | string, init: RequestInit = {}, timeoutMs = 2500): Promise<{ ok: boolean; status: number; body: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: init.signal ?? controller.signal });
    const text = await response.text();
    let body: unknown = text;
    if (text.length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    return { ok: response.ok, status: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkEndpoint(endpoint: WorkerEndpoint): Promise<WorkerHealthStatus> {
  try {
    const health = await fetchJson(`${endpoint.baseUrl}/api/health`, {}, 1500);
    let readiness: Awaited<ReturnType<typeof fetchJson>> | undefined;

    if (health.ok) {
      readiness = await fetchJson(`${endpoint.baseUrl}/api/readiness`, {}, 1500).catch((error: unknown) => ({
        ok: false,
        status: 0,
        body: error instanceof Error ? error.message : String(error),
      }));
    }

    return {
      ...endpoint,
      healthOk: health.ok,
      readinessOk: readiness?.ok ?? false,
      ready: health.ok && (readiness?.ok ?? false),
      message: health.ok
        ? readiness?.ok
          ? undefined
          : "claude-mem worker is running but still initializing"
        : "claude-mem worker unavailable. Run: npx claude-mem repair",
      health: health.body,
      readiness: readiness?.body,
    };
  } catch (error: unknown) {
    return {
      ...endpoint,
      healthOk: false,
      readinessOk: false,
      ready: false,
      message: error instanceof Error
        ? `claude-mem worker unavailable. Run: npx claude-mem repair (${error.message})`
        : "claude-mem worker unavailable. Run: npx claude-mem repair",
    };
  }
}

export async function workerHealthCheck(): Promise<WorkerHealthStatus> {
  return checkEndpoint(resolveWorkerEndpoint());
}

function runWorkerStart(endpoint: WorkerEndpoint): Promise<WorkerStartAttempt> {
  const runtimePath = resolveBunRuntime();
  const scriptPath = resolveWorkerScriptPath();

  if (!runtimePath) {
    return Promise.resolve({
      attempted: false,
      ok: false,
      message: "claude-mem worker unavailable. Run: npx claude-mem repair (Bun runtime not found)",
    });
  }

  if (!scriptPath) {
    return Promise.resolve({
      attempted: false,
      ok: false,
      runtimePath,
      message: "claude-mem worker unavailable. Run: npx claude-mem repair (plugin/scripts/worker-service.cjs not found)",
    });
  }

  return new Promise((resolve) => {
    let settled = false;
    let stdout = "";
    let stderr = "";
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const child = spawn(runtimePath, [scriptPath, "start"], {
      cwd: packageRoot,
      env: {
        ...process.env,
        CLAUDE_MEM_DATA_DIR: endpoint.dataDir,
        CLAUDE_MEM_WORKER_PORT: String(endpoint.port),
        CLAUDE_MEM_WORKER_HOST: endpoint.host,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const finish = (attempt: WorkerStartAttempt) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve(attempt);
    };

    timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finish({
        attempted: true,
        ok: false,
        runtimePath,
        scriptPath,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        message: `Timed out starting claude-mem worker after ${DEFAULT_WORKER_START_TIMEOUT_MS}ms`,
      });
    }, DEFAULT_WORKER_START_TIMEOUT_MS);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      finish({
        attempted: true,
        ok: false,
        runtimePath,
        scriptPath,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        message: error.message,
      });
    });
    child.on("close", (code) => {
      let parsedMessage: string | undefined;
      try {
        const parsed = JSON.parse(stdout) as { status?: string; message?: string };
        parsedMessage = parsed.message ?? (parsed.status ? `worker-service status: ${parsed.status}` : undefined);
      } catch {
        parsedMessage = undefined;
      }

      finish({
        attempted: true,
        ok: code === 0,
        runtimePath,
        scriptPath,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        message: parsedMessage ?? (code === 0 ? "worker-service start completed" : `worker-service start exited with code ${code}`),
      });
    });
  });
}

async function waitForWorker(endpoint: WorkerEndpoint, timeoutMs: number): Promise<WorkerHealthStatus> {
  const startedAt = Date.now();
  let lastStatus = await checkEndpoint(endpoint);

  while (!lastStatus.ready && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, lastStatus.healthOk ? 250 : 500));
    lastStatus = await checkEndpoint(endpoint);
  }

  return lastStatus;
}

let pendingEnsure: Promise<WorkerHealthStatus> | undefined;

export async function ensureWorkerAvailable(options: { startIfNeeded?: boolean; waitForReadyMs?: number } = {}): Promise<WorkerHealthStatus> {
  if (pendingEnsure) return pendingEnsure;

  pendingEnsure = (async () => {
    const endpoint = resolveWorkerEndpoint();
    const initial = await checkEndpoint(endpoint);
    const waitForReadyMs = options.waitForReadyMs ?? DEFAULT_READINESS_WAIT_MS;

    if (initial.ready) return initial;

    if (initial.healthOk) {
      const waited = waitForReadyMs > 0 ? await waitForWorker(endpoint, waitForReadyMs) : initial;
      return waited.ready ? waited : { ...waited, message: waited.message ?? "claude-mem worker is running but still initializing" };
    }

    if (options.startIfNeeded === false) return initial;

    const start = await runWorkerStart(endpoint);
    if (!start.ok) {
      return {
        ...initial,
        start,
        message: start.message ?? "claude-mem worker unavailable. Run: npx claude-mem repair",
      };
    }

    const afterStart = await waitForWorker(endpoint, waitForReadyMs);
    return {
      ...afterStart,
      start,
      message: afterStart.ready
        ? undefined
        : afterStart.message ?? "claude-mem worker started but is still initializing",
    };
  })().finally(() => {
    pendingEnsure = undefined;
  });

  return pendingEnsure;
}

export async function workerRequest<T = unknown>(
  path: string,
  options: RequestInit & { query?: Record<string, unknown>; timeoutMs?: number; ensure?: boolean } = {},
): Promise<T> {
  const endpoint = resolveWorkerEndpoint();

  if (options.ensure !== false) {
    const status = await ensureWorkerAvailable({ waitForReadyMs: Math.min(options.timeoutMs ?? 5000, DEFAULT_READINESS_WAIT_MS) });
    if (!status.ready) {
      throw new WorkerUnavailableError(status.message);
    }
  }

  const url = new URL(path, endpoint.baseUrl);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      url.searchParams.set(key, value.join(","));
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  let response: Awaited<ReturnType<typeof fetchJson>>;
  try {
    response = await fetchJson(url, {
      ...options,
      headers: {
        ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
        ...(options.headers ?? {}),
      },
    }, options.timeoutMs ?? 5000);
  } catch (error: unknown) {
    throw new WorkerUnavailableError(
      error instanceof Error
        ? `claude-mem worker unavailable. Run: npx claude-mem repair (${error.message})`
        : undefined,
    );
  }

  if (!response.ok) {
    const detail = typeof response.body === "string"
      ? response.body
      : JSON.stringify(response.body, null, 2);
    throw new Error(`claude-mem worker request failed (${response.status}): ${detail}`);
  }

  return response.body as T;
}
