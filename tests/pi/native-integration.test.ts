import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveWorkerEndpoint,
  workerHealthCheck,
  workerRequest,
} from '../../pi/client.js';
import {
  handleAgentEnd,
  handleBeforeAgentStart,
  handleToolResult,
} from '../../pi/capture.js';
import { registerMemoryTools } from '../../pi/tools.js';

interface RecordedRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
  platformSource?: string;
}

const savedEnv = {
  dataDir: process.env.CLAUDE_MEM_DATA_DIR,
  host: process.env.CLAUDE_MEM_WORKER_HOST,
  port: process.env.CLAUDE_MEM_WORKER_PORT,
};

let dataDir: string;
let port: number;
let requests: RecordedRequest[];
let server: ReturnType<typeof createServer>;

function restoreEnv(): void {
  for (const [key, value] of [
    ['CLAUDE_MEM_DATA_DIR', savedEnv.dataDir],
    ['CLAUDE_MEM_WORKER_HOST', savedEnv.host],
    ['CLAUDE_MEM_WORKER_PORT', savedEnv.port],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  let raw = '';
  for await (const chunk of req) raw += chunk.toString();
  if (!raw) return undefined;
  return JSON.parse(raw);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'claude-mem-pi-native-'));
  requests = [];
  server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const body = await readBody(req);
    requests.push({
      method: req.method ?? 'GET',
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      body,
      platformSource: req.headers['x-platform-source'] as string | undefined,
    });

    if (url.pathname === '/api/health') {
      sendJson(res, 200, { status: 'ok', initialized: true, mcpReady: true, version: '13.11.0' });
    } else if (url.pathname === '/api/readiness') {
      sendJson(res, 200, { status: 'ready', mcpReady: true });
    } else if (url.pathname === '/api/search') {
      sendJson(res, 200, { content: [{ type: 'text', text: 'search-ok' }] });
    } else if (url.pathname === '/api/timeline') {
      sendJson(res, 200, { content: [{ type: 'text', text: 'timeline-ok' }] });
    } else if (url.pathname === '/api/observations/batch') {
      sendJson(res, 200, { observations: [{ id: 11, title: 'batch result' }] });
    } else if (url.pathname === '/api/observations/by-file') {
      sendJson(res, 200, {
        observations: [{ id: 12, title: 'file result', narrative: 'file narrative', created_at: '2026-07-17T08:00:00Z' }],
      });
    } else if (url.pathname === '/api/sessions/init') {
      sendJson(res, 200, { sessionDbId: 99, promptNumber: 1 });
    } else if (url.pathname === '/api/context/inject') {
      sendJson(res, 200, 'project memory context');
    } else if (url.pathname === '/api/sessions/observations') {
      sendJson(res, 200, { queued: true });
    } else if (url.pathname === '/api/sessions/summarize') {
      sendJson(res, 200, { queued: true });
    } else {
      sendJson(res, 404, { error: 'not found' });
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not expose a TCP port');
  port = address.port;
});

afterAll(async () => {
  restoreEnv();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  rmSync(dataDir, { recursive: true, force: true });
});

beforeEach(() => {
  requests = [];
  delete process.env.CLAUDE_MEM_WORKER_HOST;
  delete process.env.CLAUDE_MEM_WORKER_PORT;
  process.env.CLAUDE_MEM_DATA_DIR = dataDir;
  writeFileSync(join(dataDir, 'settings.json'), JSON.stringify({
    CLAUDE_MEM_WORKER_HOST: '127.0.0.1',
    CLAUDE_MEM_WORKER_PORT: String(port),
  }));
});

describe('native Pi import, discovery, and worker API v13.11', () => {
  test('imports both extension entry points', async () => {
    const full = await import('../../pi/index.js');
    const toolsOnly = await import('../../pi/tools-only.js');
    expect(typeof full.default).toBe('function');
    expect(typeof toolsOnly.default).toBe('function');
  });

  test('discovers host/port from the selected data-dir settings with env precedence', () => {
    expect(resolveWorkerEndpoint()).toMatchObject({
      host: '127.0.0.1',
      port,
      dataDir,
      settingsPath: join(dataDir, 'settings.json'),
    });

    process.env.CLAUDE_MEM_WORKER_HOST = 'localhost';
    process.env.CLAUDE_MEM_WORKER_PORT = String(port + 1);
    expect(resolveWorkerEndpoint()).toMatchObject({ host: 'localhost', port: port + 1 });
  });

  test('requires both health and readiness before reporting ready', async () => {
    const status = await workerHealthCheck();
    expect(status.healthOk).toBe(true);
    expect(status.readinessOk).toBe(true);
    expect(status.ready).toBe(true);
    expect(status.health).toMatchObject({ version: '13.11.0' });
  });

  test('uses v13.11 search, timeline, batch, and by-file endpoints', async () => {
    await workerRequest('/api/search', { query: { query: 'needle', limit: 3 } });
    await workerRequest('/api/timeline', { query: { anchor: 11, depth_before: 2, depth_after: 4 } });
    await workerRequest('/api/observations/batch', {
      method: 'POST',
      body: JSON.stringify({ ids: [11, 12], orderBy: 'date_desc' }),
    });
    await workerRequest('/api/observations/by-file', {
      query: { path: '/repo/file.ts', projects: '/repo', limit: 5 },
    });

    expect(requests.filter((request) => !request.path.match(/health|readiness/))).toEqual([
      expect.objectContaining({ method: 'GET', path: '/api/search', query: { query: 'needle', limit: '3' } }),
      expect.objectContaining({ method: 'GET', path: '/api/timeline', query: { anchor: '11', depth_before: '2', depth_after: '4' } }),
      expect.objectContaining({ method: 'POST', path: '/api/observations/batch', body: { ids: [11, 12], orderBy: 'date_desc' } }),
      expect.objectContaining({ method: 'GET', path: '/api/observations/by-file', query: { path: '/repo/file.ts', projects: '/repo', limit: '5' } }),
    ]);
  });
});

describe('native Pi tools and capture contract', () => {
  test('registers and executes mem_search, timeline, batch, and status tools', async () => {
    const tools = new Map<string, any>();
    registerMemoryTools({
      registerTool(definition: any) { tools.set(definition.name, definition); },
    } as any);

    expect([...tools.keys()].sort()).toEqual(['mem_get_observations', 'mem_search', 'mem_status', 'mem_timeline']);
    expect((await tools.get('mem_search').execute('1', { query: 'needle' })).content[0].text).toBe('search-ok');
    expect((await tools.get('mem_timeline').execute('2', { anchor: 11 })).content[0].text).toBe('timeline-ok');
    const batch = await tools.get('mem_get_observations').execute('3', { ids: [11] });
    expect(batch.content[0].text).toContain('batch result');
    expect((await tools.get('mem_status').execute()).isError).toBeUndefined();
  });

  test('captures init, tool observation, by-file augmentation, and summary with platformSource=pi', async () => {
    const ctx = {
      cwd: '/repo',
      hasUI: false,
      sessionManager: {
        getSessionId: () => 'pi-session-1',
        getBranch: () => [],
        getEntries: () => [],
      },
    } as any;

    const before = await handleBeforeAgentStart({ prompt: 'user prompt' } as any, ctx);
    expect(before?.message?.content).toBe('project memory context');

    const toolResult = await handleToolResult({
      toolName: 'read',
      toolCallId: 'tool-1',
      input: { path: '/repo/file.ts' },
      content: [{ type: 'text', text: 'file body' }],
      details: {},
      isError: false,
    } as any, ctx);
    expect((toolResult?.content[0] as any).text).toContain('file result');
    expect((toolResult?.content[0] as any).text).toContain('file body');

    await handleAgentEnd([
      { role: 'assistant', content: [{ type: 'text', text: 'assistant summary' }] },
    ] as any, ctx);

    const init = requests.find((request) => request.path === '/api/sessions/init');
    const observation = requests.find((request) => request.path === '/api/sessions/observations');
    const byFile = requests.find((request) => request.path === '/api/observations/by-file');
    const summary = requests.find((request) => request.path === '/api/sessions/summarize');
    expect(init?.body).toMatchObject({ contentSessionId: 'pi:pi-session-1', platformSource: 'pi' });
    expect(observation?.body).toMatchObject({ contentSessionId: 'pi:pi-session-1', platformSource: 'pi', tool_name: 'read' });
    expect(byFile?.query).toMatchObject({ path: '/repo/file.ts', projects: '/repo', limit: '5' });
    expect(summary?.body).toMatchObject({
      contentSessionId: 'pi:pi-session-1',
      platformSource: 'pi',
      last_assistant_message: 'assistant summary',
    });
  });
});
