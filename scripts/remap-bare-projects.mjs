#!/usr/bin/env bun
import { Database } from 'bun:sqlite';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, copyFileSync } from 'fs';

const DB_PATH = join(homedir(), '.claude-mem', 'claude-mem.db');
const CHROMA_DB_PATH = join(homedir(), '.claude-mem', 'chroma', 'chroma.sqlite3');
const APPLY = process.argv.includes('--apply');

const BASENAME_MAP = [
  ['claude-mem',           '/home/nixen/tools/claude-mem'],
  ['linkedin-leadops',     '/home/nixen/Projects/linkedin-leadops'],
  ['Praca',                '/home/nixen/Private/Praca'],
  ['nate',                 '/home/nixen/Private/nate'],
  ['proxmox',              '/home/nixen/proxmox'],
  ['tac',                  '/home/nixen/tac'],
  ['pi',                   '/home/nixen/tools/pi'],
  ['second-brain',         '/home/nixen/Projects/second-brain'],
  ['skills',               '/home/nixen/shared/skills'],
  ['repos',                '/home/nixen/tac/repos'],
  ['openbrain',            '/home/nixen/Projects/second-brain/memory/openbrain'],
  ['hyperhuman',           '/home/nixen/Private/hyperhuman'],
  ['stockhurt',            '/home/nixen/Private/hyperhuman/Projects/stockhurt'],
  ['nixen',                '/home/nixen'],
  ['hyperhuman-brain-poc', '/home/nixen/Projects/hyperhuman-brain-poc'],
  ['mcp',                  '/home/nixen/.claude/mcp'],
];

function loadMap(db) {
  db.exec(`CREATE TEMP TABLE basename_map (basename TEXT PRIMARY KEY, full_path TEXT);`);
  const ins = db.prepare(`INSERT INTO basename_map VALUES (?, ?);`);
  for (const [b, f] of BASENAME_MAP) ins.run(b, f);
}

function report(db, label) {
  const rows = db.prepare(`
    SELECT 'observations' AS t, COUNT(*) AS n FROM observations
     WHERE project NOT LIKE '/%' AND project != '' AND project IS NOT NULL
    UNION ALL SELECT 'session_summaries', COUNT(*) FROM session_summaries
     WHERE project NOT LIKE '/%' AND project != '' AND project IS NOT NULL
    UNION ALL SELECT 'observation_evidence', COUNT(*) FROM observation_evidence
     WHERE project NOT LIKE '/%' AND project != '' AND project IS NOT NULL
    UNION ALL SELECT 'sdk_sessions', COUNT(*) FROM sdk_sessions
     WHERE project NOT LIKE '/%' AND project != '' AND project IS NOT NULL
  `).all();
  console.log(`\n[main DB] ${label}`);
  for (const r of rows) console.log(`  ${r.t.padEnd(22)} bare=${r.n}`);
}

function reportChroma(db, label) {
  const n = db.prepare(`
    SELECT COUNT(*) AS n FROM embedding_metadata
    WHERE key='project' AND string_value IN (SELECT basename FROM basename_map)
  `).get().n;
  console.log(`\n[chroma DB] ${label}`);
  console.log(`  embedding_metadata.project bare matching map: ${n}`);
}

function migrateMain(db) {
  // 1. observations via sdk_sessions join (recovers anything where sdk_sessions
  //    is already on the new full path but observation row drifted bare).
  const r1 = db.prepare(`
    UPDATE observations
    SET project = (
      SELECT s.project FROM sdk_sessions s
       WHERE s.memory_session_id = observations.memory_session_id
         AND s.project LIKE '/%'
    )
    WHERE project NOT LIKE '/%' AND project != ''
      AND EXISTS (
        SELECT 1 FROM sdk_sessions s
         WHERE s.memory_session_id = observations.memory_session_id
           AND s.project LIKE '/%'
      );
  `).run();
  console.log(`  observations via sdk_sessions join: ${r1.changes}`);

  // 2. sdk_sessions via basename map
  const r2 = db.prepare(`
    UPDATE sdk_sessions
    SET project = (SELECT full_path FROM basename_map WHERE basename = sdk_sessions.project)
    WHERE project IN (SELECT basename FROM basename_map) AND project NOT LIKE '/%';
  `).run();
  console.log(`  sdk_sessions via basename map: ${r2.changes}`);

  // 3. observations via basename map (covers rows whose sdk_session row has no
  //    full path either — happens when a session row was never repaired in step 2).
  const r3 = db.prepare(`
    UPDATE observations
    SET project = (SELECT full_path FROM basename_map WHERE basename = observations.project)
    WHERE project IN (SELECT basename FROM basename_map) AND project NOT LIKE '/%';
  `).run();
  console.log(`  observations via basename map: ${r3.changes}`);

  const r4a = db.prepare(`
    UPDATE session_summaries
    SET project = (
      SELECT s.project FROM sdk_sessions s
       WHERE s.memory_session_id = session_summaries.memory_session_id
         AND s.project LIKE '/%'
    )
    WHERE project NOT LIKE '/%' AND project != ''
      AND EXISTS (
        SELECT 1 FROM sdk_sessions s
         WHERE s.memory_session_id = session_summaries.memory_session_id
           AND s.project LIKE '/%'
      );
  `).run();
  console.log(`  session_summaries via sdk_sessions join: ${r4a.changes}`);

  const r4b = db.prepare(`
    UPDATE session_summaries
    SET project = (SELECT full_path FROM basename_map WHERE basename = session_summaries.project)
    WHERE project IN (SELECT basename FROM basename_map) AND project NOT LIKE '/%';
  `).run();
  console.log(`  session_summaries via basename map: ${r4b.changes}`);

  const r5a = db.prepare(`
    UPDATE observation_evidence
    SET project = (
      SELECT s.project FROM sdk_sessions s
       WHERE s.content_session_id = observation_evidence.content_session_id
         AND s.project LIKE '/%'
    )
    WHERE project NOT LIKE '/%' AND project != ''
      AND EXISTS (
        SELECT 1 FROM sdk_sessions s
         WHERE s.content_session_id = observation_evidence.content_session_id
           AND s.project LIKE '/%'
      );
  `).run();
  console.log(`  observation_evidence via sdk_sessions join: ${r5a.changes}`);

  const r5b = db.prepare(`
    UPDATE observation_evidence
    SET project = (SELECT full_path FROM basename_map WHERE basename = observation_evidence.project)
    WHERE project IN (SELECT basename FROM basename_map) AND project NOT LIKE '/%';
  `).run();
  console.log(`  observation_evidence via basename map: ${r5b.changes}`);
}

function migrateChroma(db) {
  const r = db.prepare(`
    UPDATE embedding_metadata
    SET string_value = (SELECT full_path FROM basename_map WHERE basename = embedding_metadata.string_value)
    WHERE key='project' AND string_value IN (SELECT basename FROM basename_map);
  `).run();
  console.log(`  embedding_metadata: ${r.changes}`);
}

function main() {
  if (!existsSync(DB_PATH)) {
    console.error(`main DB not found: ${DB_PATH}`);
    process.exit(1);
  }
  if (!existsSync(CHROMA_DB_PATH)) {
    console.error(`chroma DB not found: ${CHROMA_DB_PATH}`);
    process.exit(1);
  }

  const mainDb = new Database(DB_PATH);
  const chromaDb = new Database(CHROMA_DB_PATH);
  loadMap(mainDb);
  loadMap(chromaDb);

  report(mainDb, 'BEFORE');
  reportChroma(chromaDb, 'BEFORE');

  if (!APPLY) {
    console.log(`\nDry-run only. Re-run with --apply to perform UPDATEs.`);
    mainDb.close();
    chromaDb.close();
    return;
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const mainBackup = `${DB_PATH}.bak-bare-remap-${ts}`;
  const chromaBackup = `${CHROMA_DB_PATH}.bak-bare-remap-${ts}`;
  copyFileSync(DB_PATH, mainBackup);
  copyFileSync(CHROMA_DB_PATH, chromaBackup);
  console.log(`\nBackups:\n  ${mainBackup}\n  ${chromaBackup}`);

  console.log(`\n[main DB] UPDATE`);
  mainDb.exec('BEGIN TRANSACTION;');
  try {
    migrateMain(mainDb);
    mainDb.exec('COMMIT;');
  } catch (e) {
    mainDb.exec('ROLLBACK;');
    console.error(`main DB rollback: ${e.message}`);
    process.exit(1);
  }

  console.log(`\n[chroma DB] UPDATE`);
  chromaDb.exec('BEGIN TRANSACTION;');
  try {
    migrateChroma(chromaDb);
    chromaDb.exec('COMMIT;');
  } catch (e) {
    chromaDb.exec('ROLLBACK;');
    console.error(`chroma DB rollback: ${e.message}`);
    process.exit(1);
  }

  report(mainDb, 'AFTER');
  reportChroma(chromaDb, 'AFTER');

  mainDb.close();
  chromaDb.close();
  console.log(`\nDone. Restart chroma-mcp (pkill -f chroma-mcp) so the in-memory cache reloads.`);
}

main();
