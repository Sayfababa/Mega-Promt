/**
 * Manual JSON export / import (spec 17). The checksum (FNV-1a over the stable-stringified state)
 * detects accidental corruption; it is explicitly NOT tamper protection in offline singleplayer.
 */
import { hashOf } from '../engine/core/hash';
import type { GameState } from '../engine/state/gameState';
import { migrate } from './migrations';
import { validateGameState } from './schema';

export const EXPORT_FORMAT = 'darkforge-save';

export interface SaveExport {
  format: typeof EXPORT_FORMAT;
  saveSchemaVersion: number;
  balanceVersion: number;
  contentVersion: number;
  exportedAt: string;
  checksum: string;
  state: GameState;
}

export function exportSave(state: GameState, exportedAt: string = new Date().toISOString()): string {
  const v = validateGameState(state);
  if (!v.ok) throw new Error(`Export abgelehnt: ${v.error}`);
  // JSON round trip first so the checksum covers exactly what the file contains
  const plain = JSON.parse(JSON.stringify(state)) as GameState;
  const doc: SaveExport = {
    format: EXPORT_FORMAT,
    saveSchemaVersion: plain.saveSchemaVersion,
    balanceVersion: plain.balanceVersion,
    contentVersion: plain.contentVersion,
    exportedAt,
    checksum: hashOf(plain),
    state: plain,
  };
  return JSON.stringify(doc, null, 2);
}

export type ImportResult = { ok: true; state: GameState; migratedFrom: number } | { ok: false; error: string };

export function importSave(text: string): ImportResult {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Import abgelehnt: Die Datei ist kein gültiges JSON.' };
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { ok: false, error: 'Import abgelehnt: Unerwartetes Dateiformat.' };
  const d = doc as Partial<SaveExport>;
  if (d.format !== EXPORT_FORMAT) return { ok: false, error: 'Import abgelehnt: Dies ist keine DARKFORGE-Speicherdatei.' };
  if (typeof d.checksum !== 'string' || d.state === undefined) return { ok: false, error: 'Import abgelehnt: Prüfsumme oder Spielstand fehlt.' };
  if (hashOf(d.state) !== d.checksum) return { ok: false, error: 'Import abgelehnt: Prüfsumme stimmt nicht – die Datei ist beschädigt oder wurde verändert.' };
  const m = migrate(d.state);
  if (!m.ok) return { ok: false, error: `Import abgelehnt: ${m.error}` };
  const v = validateGameState(m.state);
  if (!v.ok) return { ok: false, error: `Import abgelehnt: ${v.error}` };
  return { ok: true, state: v.state, migratedFrom: m.from };
}
