import 'fake-indexeddb/auto';
import { applyCommand, type Command } from '../../engine/state/commands';
import { newGameState, type GameState } from '../../engine/state/gameState';
import { hashOf } from '../../engine/core/hash';
import { validateGameState } from '../../persistence/schema';
import { exportSave, importSave } from '../../persistence/exportImport';
import { SaveDb, commitSnapshot, loadLatest, listSnapshots, MAX_SNAPSHOTS } from '../../persistence/db';
import { migrate } from '../../persistence/migrations';

function run(s: GameState, ...cmds: Command[]): GameState {
  for (const c of cmds) {
    const r = applyCommand(s, c);
    if (!r.ok) throw new Error(`${c.type}: ${r.error}`);
    s = r.state;
  }
  return s;
}

/** a realistic state: character, resolved + claimed run, equip, salvage, craft */
function playedState(): GameState {
  let s = run(newGameState(4242),
    { type: 'CREATE_CHARACTER', name: 'Thorgar', classId: 'guardian' },
    { type: 'START_RUN', dungeonId: 'forsaken_gate', monsterLevel: 1 },
    { type: 'RESOLVE_RUN' },
    { type: 'CLAIM_REWARDS' },
  );
  const weapon = s.inventory.find((u) => s.items[u]!.baseId.startsWith('shortsword') && s.items[u]!.rarity === 'magic');
  if (weapon) s = run(s, { type: 'EQUIP_ITEM', uid: weapon });
  const normal = s.inventory.find((u) => s.items[u]!.rarity === 'normal');
  if (normal) s = run(s, { type: 'CRAFT_ITEM', uid: normal, recipe: 'imprint' });
  s = run(s, { type: 'TOGGLE_LOCK', uid: s.inventory[0]! }, { type: 'START_RUN', dungeonId: 'forsaken_gate', monsterLevel: 2 }, { type: 'RESOLVE_RUN' });
  return s;
}

describe('persistence: schema', () => {
  it('accepts a real state after several commands and reproduces it exactly', () => {
    const s = playedState();
    expect(s.activeRun?.playerSnapshot).toBeTruthy();
    expect(s.craftLog.length).toBeGreaterThan(0);
    const v = validateGameState(s);
    if (!v.ok) throw new Error(v.error);
    expect(v.state).toEqual(s);
    expect(hashOf(v.state)).toBe(hashOf(s));
  });
  it('accepts the empty pre-character state', () => {
    expect(validateGameState(newGameState(1)).ok).toBe(true);
  });
  it('rejects broken references and invalid numbers', () => {
    const s = playedState();
    const dangling = structuredClone(s);
    dangling.inventory.push('i9999');
    const r1 = validateGameState(dangling);
    expect(r1.ok).toBe(false);
    const dup = structuredClone(s);
    dup.stash.push(dup.inventory[0]!);
    expect(validateGameState(dup).ok).toBe(false);
    const neg = structuredClone(s);
    neg.gold = -5;
    expect(validateGameState(neg).ok).toBe(false);
    const nan = structuredClone(s);
    nan.character!.xp = Number.NaN;
    expect(validateGameState(nan).ok).toBe(false);
  });
  it('migration refuses saves from a newer schema', () => {
    const s = { ...newGameState(1), saveSchemaVersion: 99 };
    expect(migrate(s).ok).toBe(false);
  });
});

describe('persistence: export / import', () => {
  it('round trip yields the identical state', () => {
    const s = playedState();
    const r = importSave(exportSave(s));
    if (!r.ok) throw new Error(r.error);
    expect(hashOf(r.state)).toBe(hashOf(s));
    expect(r.state.character).toEqual(s.character);
  });
  it('rejects invalid JSON with an understandable message', () => {
    const r = importSave('{ das ist kein json');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/kein gültiges JSON/);
  });
  it('rejects a manipulated checksum', () => {
    const doc = JSON.parse(exportSave(playedState()));
    doc.checksum = '00000000';
    const r = importSave(JSON.stringify(doc));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Prüfsumme/);
  });
  it('rejects a manipulated state (checksum no longer matches)', () => {
    const doc = JSON.parse(exportSave(playedState()));
    doc.state.gold += 100000;
    const r = importSave(JSON.stringify(doc));
    expect(r.ok).toBe(false);
  });
  it('rejects a structurally invalid state even with a matching checksum', () => {
    const doc = JSON.parse(exportSave(playedState()));
    doc.state.character.level = 'zehn';
    doc.checksum = hashOf(doc.state);
    const r = importSave(JSON.stringify(doc));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/character\.level/);
  });
  it('rejects foreign files', () => {
    expect(importSave(JSON.stringify({ hello: 'world' })).ok).toBe(false);
  });
});

describe('persistence: Dexie snapshots', () => {
  it('backup rotation keeps at most 3 working snapshots, newest loads', async () => {
    const db = new SaveDb(`test-rotation-${Math.random()}`);
    let s = run(newGameState(7), { type: 'CREATE_CHARACTER', name: 'Rota', classId: 'guardian' });
    for (let i = 0; i < 6; i++) {
      await commitSnapshot(db, s, 1000 + i);
      s = run(s, { type: 'TOGGLE_LOCK', uid: s.inventory[0] ?? s.character!.equipment.mainhand! });
    }
    const metas = await listSnapshots(db);
    expect(metas.length).toBe(MAX_SNAPSHOTS);
    expect(metas.map((m) => m.savedAt)).toEqual([1005, 1004, 1003]);
    const loaded = await loadLatest(db);
    expect(loaded?.record.savedAt).toBe(1005);
    db.close();
  });
  it('a damaged newest snapshot falls back to the previous working one', async () => {
    const db = new SaveDb(`test-repair-${Math.random()}`);
    const s1 = playedState();
    await commitSnapshot(db, s1, 1);
    const s2 = run(s1, { type: 'CLAIM_REWARDS' });
    const { seq } = await commitSnapshot(db, s2, 2);
    await db.saves.update(seq, { checksum: 'deadbeef' });
    const loaded = await loadLatest(db);
    expect(loaded?.skipped).toBe(1);
    expect(hashOf(loaded!.state)).toBe(hashOf(s1));
    db.close();
  });
  it('invalid states are never written', async () => {
    const db = new SaveDb(`test-invalid-${Math.random()}`);
    const bad = structuredClone(playedState());
    bad.inventory.push('ghost');
    await expect(commitSnapshot(db, bad)).rejects.toThrow(/Speichern abgelehnt/);
    expect(await db.saves.count()).toBe(0);
    db.close();
  });
  it('the active character is reconstructed identically from IndexedDB', async () => {
    const db = new SaveDb(`test-identity-${Math.random()}`);
    const s = playedState();
    await commitSnapshot(db, s);
    const loaded = await loadLatest(db);
    expect(loaded!.state).toEqual(s);
    db.close();
  });
});
