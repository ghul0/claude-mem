import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { SessionStore } from '../../../src/services/sqlite/SessionStore.js';
import { getObservationsByFilePath } from '../../../src/services/sqlite/observations/get.js';

const RECONCILIATION_FLAG = 'CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED';

describe('reconciliation status filters across observation/session joins', () => {
  let store: SessionStore;
  let previousFlag: string | undefined;
  let observationId: number;
  const filePath = '/repo/src/joined.ts';

  beforeEach(() => {
    previousFlag = process.env[RECONCILIATION_FLAG];
    process.env[RECONCILIATION_FLAG] = 'true';
    store = new SessionStore(':memory:');
    for (const table of ['observations', 'sdk_sessions']) {
      const columns = store.db.query(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
      if (!columns.some((column) => column.name === 'status')) {
        store.db.run(`ALTER TABLE ${table} ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
      }
    }

    const sdkId = store.createSDKSession('content-joined-status', 'joined-project', 'prompt', undefined, 'codex');
    store.updateMemorySessionId(sdkId, 'memory-joined-status');
    observationId = store.storeObservations(
      'memory-joined-status',
      'joined-project',
      [{
        type: 'discovery',
        title: 'joined status lookup',
        subtitle: null,
        facts: ['both joined tables expose a status column'],
        narrative: null,
        concepts: [],
        files_read: [filePath],
        files_modified: [],
      }],
      null,
      0,
      0,
      1_700_000_000_000,
    ).observationIds[0];
  });

  afterEach(() => {
    store.close();
    if (previousFlag === undefined) delete process.env[RECONCILIATION_FLAG];
    else process.env[RECONCILIATION_FLAG] = previousFlag;
  });

  it('hydrates observation IDs without an ambiguous status column', () => {
    const results = store.getObservationsByIds(
      [observationId],
      { platformSource: 'codex', project: 'joined-project' },
    );

    expect(results.map((row) => row.id)).toEqual([observationId]);
  });

  it('looks up observations by file without an ambiguous status column', () => {
    const results = getObservationsByFilePath(
      store.db,
      filePath,
      { platformSource: 'codex', projects: ['joined-project'] },
    );

    expect(results.map((row) => row.id)).toEqual([observationId]);
  });
});
