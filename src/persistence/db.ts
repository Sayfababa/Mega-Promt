/**
 * IndexedDB persistence via Dexie (spec 17).
 * - Table `saves`: one row per snapshot (auto-increment `seq`).
 * - commitSnapshot validates (Zod) BEFORE writing, then adds the snapshot and prunes older rows in ONE
 *   read-write transaction → backup rotation keeps the last MAX_SNAPSHOTS working snapshots.
 * - loadLatest walks newest → oldest and returns the first snapshot that passes schema + checksum
 *   (repair on partial corruption: a damaged newest snapshot falls back to the previous one).
 * Snapshots contain no combat event logs (runs keep only hashes + the player snapshot for replay).
 */
import Dexie, { type Table } from 'dexie';
import { hashOf } from '../engine/core/hash';
import type { GameState } from '../engine/state/gameState';
import { migrate } from './migrations';
import { validateGameState } from './schema';

export const MAX_SNAPSHOTS = 3;

export interface SaveRecord {
  seq?: number;
  savedAt: number;
  checksum: string;
  saveSchemaVersion: number;
  balanceVersion: number;
  contentVersion: number;
  characterName: string | null;
  level: number | null;
  state: GameState;
}

export class SaveDb extends Dexie {
  saves!: Table<SaveRecord, number>;
  constructor(name = 'darkforge') {
    super(name);
    this.version(1).stores({ saves: '++seq, savedAt' });
  }
}

let defaultDb: SaveDb | null = null;
export function getDb(): SaveDb {
  if (!defaultDb) defaultDb = new SaveDb();
  return defaultDb;
}

export async function commitSnapshot(db: SaveDb, state: GameState, now: number = Date.now()): Promise<{ seq: number; checksum: string }> {
  const v = validateGameState(state);
  if (!v.ok) throw new Error(`Speichern abgelehnt: ${v.error}`);
  const snapshot = structuredClone(state);
  const checksum = hashOf(snapshot);
  const rec: SaveRecord = {
    savedAt: now,
    checksum,
    saveSchemaVersion: snapshot.saveSchemaVersion,
    balanceVersion: snapshot.balanceVersion,
    contentVersion: snapshot.contentVersion,
    characterName: snapshot.character?.name ?? null,
    level: snapshot.character?.level ?? null,
    state: snapshot,
  };
  let seq = 0;
  await db.transaction('rw', db.saves, async () => {
    seq = await db.saves.add(rec);
    const keys = (await db.saves.orderBy('seq').primaryKeys()) as number[];
    const excess = keys.length - MAX_SNAPSHOTS;
    if (excess > 0) await db.saves.bulkDelete(keys.slice(0, excess));
  });
  return { seq, checksum };
}

export interface LoadResult {
  state: GameState;
  record: SaveRecord;
  /** number of newer snapshots skipped because they were damaged */
  skipped: number;
  skippedReasons: string[];
}

export function checkRecord(rec: SaveRecord): { ok: true; state: GameState } | { ok: false; error: string } {
  if (!rec || typeof rec !== 'object' || !rec.state) return { ok: false, error: 'Snapshot ohne Spielstand.' };
  if (hashOf(rec.state) !== rec.checksum) return { ok: false, error: 'Prüfsumme stimmt nicht.' };
  const m = migrate(rec.state);
  if (!m.ok) return m;
  return validateGameState(m.state);
}

export async function loadLatest(db: SaveDb): Promise<LoadResult | null> {
  const all = await db.saves.orderBy('seq').reverse().toArray();
  const reasons: string[] = [];
  for (const rec of all) {
    const r = checkRecord(rec);
    if (r.ok) return { state: r.state, record: rec, skipped: reasons.length, skippedReasons: reasons };
    reasons.push(`Snapshot #${rec.seq ?? '?'}: ${r.error}`);
  }
  return null;
}

export async function listSnapshots(db: SaveDb): Promise<Omit<SaveRecord, 'state'>[]> {
  const all = await db.saves.orderBy('seq').reverse().toArray();
  return all.map(({ state: _s, ...meta }) => meta);
}

export async function clearSaves(db: SaveDb): Promise<void> {
  await db.saves.clear();
}
