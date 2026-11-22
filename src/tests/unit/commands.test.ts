import { applyCommand, derivedFor, type Command } from '../../engine/state/commands';
import { newGameState, type GameState } from '../../engine/state/gameState';
import { mkItem } from '../fixtures/items';
import { applyCraft, validateCraft, craftPreview } from '../../engine/crafting/recipes';

function run(s: GameState, ...cmds: Command[]): GameState {
  for (const c of cmds) {
    const r = applyCommand(s, c);
    if (!r.ok) throw new Error(`${c.type}: ${r.error}`);
    s = r.state;
  }
  return s;
}
const fresh = (): GameState => run(newGameState(1234), { type: 'CREATE_CHARACTER', name: 'Thorgar', classId: 'guardian' });
function give(s: GameState, item: ReturnType<typeof mkItem>): string {
  const uid = `t${Object.keys(s.items).length + 100}`;
  s.items[uid] = { ...item, uid };
  s.inventory.push(uid);
  return uid;
}

describe('commands', () => {
  it('create character equips starter gear and is the only state mutation path', () => {
    const s = fresh();
    expect(s.character!.level).toBe(1);
    expect(s.character!.equipment.mainhand).toBeTruthy();
    expect(s.character!.activeSkills).toEqual(['g_cleave']);
    expect(applyCommand(s, { type: 'CREATE_CHARACTER', name: 'X', classId: 'guardian' }).ok).toBe(false);
    expect(applyCommand(newGameState(1), { type: 'CREATE_CHARACTER', name: 'Ab', classId: 'arcanist' }).ok).toBe(false);
  });
  it('failed command returns the original state object unchanged (rollback)', () => {
    const s = fresh();
    const snapshot = JSON.stringify(s);
    const r = applyCommand(s, { type: 'EQUIP_ITEM', uid: 'nope' });
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
  it('2H weapon blocks offhand; equipping 2H moves shield to inventory', () => {
    let s = fresh();
    const shield = give(s, mkItem('', 'shield_t1'));
    s = run(s, { type: 'EQUIP_ITEM', uid: shield });
    const axe = give(s, mkItem('', 'greataxe_t1'));
    s = run(s, { type: 'EQUIP_ITEM', uid: axe });
    expect(s.character!.equipment.offhand).toBeNull();
    expect(s.inventory).toContain(shield);
    const r = applyCommand(s, { type: 'EQUIP_ITEM', uid: shield });
    expect(r.ok).toBe(false);
  });
  it('one item instance can never occupy two places', () => {
    let s = fresh();
    const ring = give(s, mkItem('', 'ring_ruby'));
    s = run(s, { type: 'EQUIP_ITEM', uid: ring, slot: 'ringA' });
    expect(applyCommand(s, { type: 'EQUIP_ITEM', uid: ring, slot: 'ringB' }).ok).toBe(false);
    expect(applyCommand(s, { type: 'STASH_ITEM', uid: ring, to: 'stash' }).ok).toBe(false);
  });
  it('locked items cannot be salvaged', () => {
    let s = fresh();
    const it = give(s, mkItem('', 'helm_plate_t1'));
    s = run(s, { type: 'TOGGLE_LOCK', uid: it });
    expect(applyCommand(s, { type: 'SALVAGE_ITEMS', uids: [it] }).ok).toBe(false);
    s = run(s, { type: 'TOGGLE_LOCK', uid: it }, { type: 'SALVAGE_ITEMS', uids: [it] });
    expect(s.items[it]).toBeUndefined();
    expect(s.materials.FORGE_DUST).toBe(1);
  });
  it('talent removal requires connectivity and costs gold', () => {
    let s = fresh();
    s.character!.level = 5;
    s = run(s, { type: 'SET_PASSIVE', nodeId: 'g_s_phys', allocate: true }, { type: 'SET_PASSIVE', nodeId: 'g_s_bleed', allocate: true });
    expect(applyCommand(s, { type: 'SET_PASSIVE', nodeId: 'g_k_bloodcourt', allocate: true }).ok).toBe(false); // not connected
    expect(applyCommand(s, { type: 'SET_PASSIVE', nodeId: 'g_s_phys', allocate: false }).ok).toBe(false); // would disconnect
    const noGold = applyCommand(s, { type: 'SET_PASSIVE', nodeId: 'g_s_bleed', allocate: false });
    expect(noGold.ok).toBe(false);
    s.gold = 10_000;
    s = run(s, { type: 'SET_PASSIVE', nodeId: 'g_s_bleed', allocate: false });
    expect(s.gold).toBe(10_000 - Math.ceil(100 * Math.pow(5, 1.2)));
    s = run(s, { type: 'RESET_BUILD' });
    expect(s.character!.passives).toEqual(['g_root']);
    expect(s.gold).toBe(10_000 - Math.ceil(100 * Math.pow(5, 1.2))); // first reset free
  });
  it('a run: start → resolve → claim is idempotent and never duplicates items', () => {
    let s = run(fresh(), { type: 'START_RUN', dungeonId: 'forsaken_gate', monsterLevel: 1 }, { type: 'RESOLVE_RUN' });
    expect(applyCommand(s, { type: 'RESOLVE_RUN' }).ok).toBe(false);
    s = run(s, { type: 'CLAIM_REWARDS' });
    const count = Object.keys(s.items).length;
    const inv = [...s.inventory];
    const gold = s.gold;
    s = run(s, { type: 'CLAIM_REWARDS' });
    expect(Object.keys(s.items).length).toBe(count);
    expect(s.inventory).toEqual(inv);
    expect(s.gold).toBe(gold);
    expect(s.activeRun!.victory).toBe(true);
    expect(s.character!.level).toBeGreaterThan(1);
    // first clear guarantee: magic weapon present
    const weapons = s.inventory.map((u) => s.items[u]!).filter((i) => i.history.some((h) => h.action === 'guarantee'));
    expect(weapons.length).toBe(1);
    expect(weapons[0]!.rarity).toBe('magic');
  });
  it('dungeon level gating: only cleared+1 is allowed', () => {
    const s = fresh();
    expect(applyCommand(s, { type: 'START_RUN', dungeonId: 'forsaken_gate', monsterLevel: 3 }).ok).toBe(false);
    expect(applyCommand(s, { type: 'START_RUN', dungeonId: 'decayed_crypt', monsterLevel: 8 }).ok).toBe(true);
  });
  it('full inventory → rewards go to persisted pending panel, never lost', () => {
    let s = fresh();
    for (let i = 0; i < 60; i++) give(s, mkItem('', 'ring_onyx'));
    s = run(s, { type: 'START_RUN', dungeonId: 'forsaken_gate', monsterLevel: 1 }, { type: 'RESOLVE_RUN' });
    const rewardUids = s.activeRun!.rewards!.itemUids;
    s = run(s, { type: 'CLAIM_REWARDS' });
    for (const u of rewardUids) expect(s.pendingRewards).toContain(u);
    expect(s.inventory.length).toBe(60);
  });
  it('equip changes derived stats', () => {
    let s = fresh();
    const before = derivedFor(s).weapon.max;
    const w = give(s, mkItem('', 'shortsword_t1', { rarity: 'magic', ilvl: 5, prefixes: [{ familyId: 'p01', tier: 5, values: [40] }] }));
    s = run(s, { type: 'EQUIP_ITEM', uid: w });
    expect(derivedFor(s).weapon.max).toBeCloseTo(before * 1.4);
  });
});

describe('crafting (spec 8 / 21)', () => {
  it('missing material → no change at all', () => {
    const s = fresh();
    const uid = give(s, mkItem('', 'helm_plate_t1', { ilvl: 10 }));
    const r = applyCommand(s, { type: 'CRAFT_ITEM', uid, recipe: 'imprint' });
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
  });
  it('imprint debits exactly once and produces a valid magic item', () => {
    let s = fresh();
    const uid = give(s, mkItem('', 'helm_plate_t1', { ilvl: 10 }));
    s.materials.FORGE_DUST = 4; s.materials.ARCANE_SHARD = 1;
    s = run(s, { type: 'CRAFT_ITEM', uid, recipe: 'imprint' });
    expect(s.items[uid]!.rarity).toBe('magic');
    expect(s.items[uid]!.prefixes.length + s.items[uid]!.suffixes.length).toBe(1);
    expect(s.materials.FORGE_DUST).toBe(0);
    expect(s.craftLog.length).toBe(1);
    expect(applyCommand(s, { type: 'CRAFT_ITEM', uid, recipe: 'imprint' }).ok).toBe(false);
  });
  it('precise essence with no matching pool is refused without cost (spec 8.2: Leben auf Zweihandaxt)', () => {
    const axe = mkItem('a', 'greataxe_t5', { rarity: 'rare', ilvl: 82, prefixes: [{ familyId: 'p01', tier: 3, values: [80] }, { familyId: 'p02', tier: 4, values: [6, 10] }], suffixes: [{ familyId: 's05', tier: 2, values: [15] }, { familyId: 's01', tier: 3, values: [15] }] });
    expect(validateCraft(axe, 'preciseEssence', { essence: 'life' })).toMatch(/keine zulässige/);
    expect(validateCraft(axe, 'preciseEssence', { essence: 'power' })).toBeNull();
    const odds = craftPreview(axe, 'preciseEssence', { essence: 'power' });
    expect(odds.map((o) => o.familyId)).toEqual(['p18']); // p01/p02/s01 used, p07 not allowed on weapons → bleed synergy (spec 8.2)
    expect(validateCraft(axe, 'tierUp', { affixIndex: 1 })).toBeNull();
    expect(validateCraft(axe, 'perfect', { affixIndex: 2 })).toBeNull();
    const out = applyCraft(axe, 'perfect', { affixIndex: 2 }, 1);
    expect(out.item.suffixes[0]!.tier).toBe(1);
  });
  it('sealed affix survives exactly one reforge', () => {
    const rare = mkItem('r', 'ring_ruby', { rarity: 'rare', ilvl: 50, prefixes: [{ familyId: 'p13', tier: 3, values: [80] }, { familyId: 'p06', tier: 3, values: [20] }], suffixes: [{ familyId: 's11', tier: 3, values: [25] }] });
    const sealed = applyCraft(rare, 'seal', { affixIndex: 0 }, 1).item;
    expect(validateCraft(sealed, 'seal', { affixIndex: 1 })).toMatch(/bereits/);
    for (let seed = 0; seed < 50; seed++) {
      const out = applyCraft(sealed, 'reforge', {}, seed).item;
      expect(out.prefixes.concat(out.suffixes).length).toBe(3);
      const kept = out.prefixes.find((a) => a.familyId === 'p13');
      expect(kept).toEqual({ familyId: 'p13', tier: 3, values: [80], sealed: undefined });
      const groups = out.prefixes.concat(out.suffixes).map((a) => a.familyId);
      expect(new Set(groups).size).toBe(groups.length);
    }
  });
  it('corrupted items cannot be reforged; uniques cannot gain rare affixes', () => {
    const rare = { ...mkItem('r', 'ring_ruby', { rarity: 'rare', ilvl: 80, prefixes: [{ familyId: 'p13', tier: 3, values: [80] }, { familyId: 'p06', tier: 3, values: [20] }, { familyId: 'p08', tier: 3, values: [20] }] }), corrupted: true };
    expect(validateCraft(rare, 'reforge')).not.toBeNull();
    const uniq = mkItem('u', 'shortsword_t1', { rarity: 'unique', uniqueId: 'u_copperripper', ilvl: 10 });
    for (const r of ['imprint', 'enrich', 'elevate', 'augment', 'preciseEssence', 'reforge'] as const) expect(validateCraft(uniq, r, { essence: 'power' })).not.toBeNull();
  });
  it('T2→T1 only at ilvl 80+, tierUp respects ilvl gates', () => {
    const low = mkItem('x', 'ring_ruby', { rarity: 'rare', ilvl: 79, prefixes: [{ familyId: 'p13', tier: 2, values: [100] }] });
    expect(validateCraft(low, 'perfect', { affixIndex: 0 })).toMatch(/80/);
    const lowT = mkItem('x', 'ring_ruby', { rarity: 'rare', ilvl: 39, prefixes: [{ familyId: 'p13', tier: 4, values: [50] }] });
    expect(validateCraft(lowT, 'tierUp', { affixIndex: 0 })).toMatch(/erlaubt/);
  });
});

describe('replay', () => {
  it('replaying a stored encounter reproduces the stored event hash', async () => {
    const { replayRunEncounter } = await import('../../engine/state/commands');
    const s = run(fresh(), { type: 'START_RUN', dungeonId: 'forsaken_gate', monsterLevel: 1 }, { type: 'RESOLVE_RUN' });
    for (let i = 0; i < s.activeRun!.encounters.length; i++) {
      const r = replayRunEncounter(s.activeRun!, i);
      expect(r.verified).toBe(true);
      expect(r.result.events.length).toBeGreaterThan(5);
    }
  });
});
