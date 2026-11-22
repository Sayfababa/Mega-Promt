/**
 * Save-schema migrations (spec 17: Versionsmigration). saveSchemaVersion is separate from
 * balanceVersion / contentVersion. v1 is the first version → no steps yet; the registry is the
 * place to add `MIGRATIONS[n] = (state_vn) => state_v(n+1)`.
 */
import { SAVE_SCHEMA_VERSION } from '../content/balance';

type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[v] migrates a save from version v to v+1 */
export const MIGRATIONS: Record<number, Migration> = {};

export type MigrationResult = { ok: true; state: unknown; from: number; to: number } | { ok: false; error: string };

export function migrate(raw: unknown): MigrationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Spielstand ist kein Objekt.' };
  const obj = raw as Record<string, unknown>;
  const v = obj.saveSchemaVersion;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) return { ok: false, error: 'Spielstand hat keine gültige saveSchemaVersion.' };
  if (v > SAVE_SCHEMA_VERSION) return { ok: false, error: `Spielstand stammt aus einer neueren Version (Schema ${v}, unterstützt bis ${SAVE_SCHEMA_VERSION}).` };
  let state: Record<string, unknown> = structuredClone(obj);
  for (let cur = v; cur < SAVE_SCHEMA_VERSION; cur++) {
    const step = MIGRATIONS[cur];
    if (!step) return { ok: false, error: `Keine Migration von Schema ${cur} auf ${cur + 1} vorhanden.` };
    state = { ...step(state), saveSchemaVersion: cur + 1 };
  }
  return { ok: true, state, from: v, to: SAVE_SCHEMA_VERSION };
}
