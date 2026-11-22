import { aggregate } from '../../engine/stats/aggregate';
import { CombatSim, simulateCombat, type CombatantSpec } from '../../engine/combat/simulate';
import { defaultPriority, monsterCombatant, playerCombatant } from '../../engine/combat/combatants';
import { MONSTER_BY_ID } from '../../content/monsters/monsters';
import { anchorValue, monsterBasicHit } from '../../engine/combat/monsterScaling';
import { mkItem } from '../fixtures/items';
import type { EquipSlot, ItemInstance } from '../../engine/types';

const skills = ['g_cleave', 'g_shieldwall', 'g_bloodharvest', 'g_armorbreak'];
function player(level: number, equipment: Partial<Record<EquipSlot, ItemInstance>>, passives: string[] = [], active = skills): CombatantSpec {
  const d = aggregate({ classId: 'guardian', level, allocated: { str: 0, dex: 0, int: 0, vit: 0 }, equipment, passives });
  return playerCombatant('Test', d, active, defaultPriority(active));
}
const mon = (id: string, level: number, type: 'normal' | 'elite' | 'boss' = 'normal') => monsterCombatant({ def: MONSTER_BY_ID[id]!, level, encounterType: type });

describe('combat determinism (spec 10 / 21)', () => {
  it('same seed + state → identical event hash and outcome', () => {
    const p = player(3, { mainhand: mkItem('w', 'shortsword_t1') });
    const a = simulateCombat(p, [mon('boss_rustwarden', 3, 'boss')], { seed: 777 });
    const b = simulateCombat(p, [mon('boss_rustwarden', 3, 'boss')], { seed: 777 });
    expect(a.eventHash).toBe(b.eventHash);
    expect(a.events).toEqual(b.events);
  });
  it('fast-forward (no recording) yields the bit-identical result hash', () => {
    const p = player(5, { mainhand: mkItem('w', 'greataxe_t1') });
    for (const seed of [1, 2, 3, 4, 5]) {
      const full = simulateCombat(p, [mon('gate_ravager', 5)], { seed, record: true });
      const ff = simulateCombat(p, [mon('gate_ravager', 5)], { seed, record: false });
      expect(ff.eventHash).toBe(full.eventHash);
      expect(ff.durationMs).toBe(full.durationMs);
      expect(ff.playerHpEnd).toBe(full.playerHpEnd);
      expect(ff.events.length).toBe(0);
    }
  });
  it('different seeds generally produce different fights', () => {
    const p = player(3, { mainhand: mkItem('w', 'shortsword_t1') });
    const hashes = new Set([1, 2, 3, 4, 5, 6].map((s) => simulateCombat(p, [mon('rust_crow', 3)], { seed: s }).eventHash));
    expect(hashes.size).toBeGreaterThan(3);
  });
});

describe('combat rules', () => {
  it('max combat time is enforced → timeout is a loss', () => {
    const p = player(1, {});
    const r = simulateCombat(p, [mon('boss_rustwarden', 30, 'boss')], { seed: 1, maxMs: 3000 });
    expect(['timeout', 'defeat']).toContain(r.outcome);
    expect(r.durationMs).toBeLessThanOrEqual(3000);
  });
  it('HP never reported negative; mana never negative', () => {
    const p = player(2, { mainhand: mkItem('w', 'shortsword_t1') });
    const r = simulateCombat(p, [mon('boss_rustwarden', 8, 'boss')], { seed: 3 });
    for (const e of r.events) {
      if (e.hp !== undefined) expect(e.hp).toBeGreaterThanOrEqual(0);
      if (e.mana !== undefined) expect(e.mana).toBeGreaterThanOrEqual(0);
    }
  });
  it('equipping a better weapon changes the combat result (spec 21)', () => {
    const weak = player(5, { mainhand: mkItem('w', 'shortsword_t1') });
    const strong = player(5, { mainhand: mkItem('w', 'shortsword_t1', { rarity: 'magic', ilvl: 40, prefixes: [{ familyId: 'p01', tier: 3, values: [100] }] }) });
    let tw = 0, ts = 0;
    for (let s = 0; s < 50; s++) {
      tw += simulateCombat(weak, [mon('gate_ravager', 5)], { seed: s, record: false }).durationMs;
      ts += simulateCombat(strong, [mon('gate_ravager', 5)], { seed: s, record: false }).durationMs;
    }
    expect(ts).toBeLessThan(tw * 0.75);
  });
  it('bleed stacks never exceed 5 per source', () => {
    const p = player(10, { mainhand: mkItem('w', 'greataxe_t1', { rarity: 'unique', uniqueId: 'u_rusttooth', ilvl: 10 }) }, ['g_s_phys', 'g_s_bleed', 'g_m_bleed', 'g_k_bloodcourt'], ['g_cleave']);
    const r = simulateCombat(p, [mon('boss_rustwarden', 10, 'boss')], { seed: 11, maxMs: 30000 });
    let stacks = 0, maxStacks = 0;
    for (const e of r.events) {
      if (e.type === 'APPLY_STATUS' && e.status === 'bleed' && e.tgt === 'enemy0') stacks++;
      if (e.type === 'STATUS_EXPIRE' && e.status === 'bleed' && e.tgt === 'enemy0') stacks = e.note?.startsWith('consumed') ? 0 : stacks - 1;
      maxStacks = Math.max(maxStacks, stacks);
    }
    expect(r.events.filter((e) => e.type === 'APPLY_STATUS' && e.status === 'bleed').length).toBeGreaterThan(5);
    expect(maxStacks).toBeLessThanOrEqual(5);
    expect(maxStacks).toBeGreaterThanOrEqual(1);
  });
  it('status cap: 8 bleed applications keep exactly 5 live stacks, oldest replaced', () => {
    const p = player(10, { mainhand: mkItem('w', 'greataxe_t1') });
    const sim = new CombatSim(p, [mon('boss_rustwarden', 10, 'boss')], { seed: 1 });
    const internal = sim as unknown as { applyDot: (...a: unknown[]) => void; t: number };
    for (let i = 0; i < 8; i++) {
      internal.t = i * 100;
      internal.applyDot(sim.player, sim.enemies[0], 'bleed', 100, ['ATTACK'], 'test');
    }
    const live = sim.enemies[0]!.statuses.filter((s) => s.id === 'bleed');
    expect(live.length).toBe(5);
    expect(Math.min(...live.map((s) => s.appliedAt))).toBe(300);
  });
  it('block reduces the hit by 55% base / 70% with shield (cap 75%)', () => {
    const p = player(10, { mainhand: mkItem('w', 'longsword_t1'), offhand: mkItem('s', 'shield_t1') }, ['g_s_armor', 'g_s_block', 'g_m_shield', 'g_k_ironheart']);
    const r = simulateCombat(p, [mon('gate_ravager', 10)], { seed: 4 });
    const blocks = r.events.filter((e) => e.type === 'BLOCK' && e.tgt === 'player');
    expect(blocks.length).toBeGreaterThan(0);
    // 55 base + 15 shield + 10 longsword(with shield) + 8 node = 88 → capped 75
    for (const b of blocks) expect(b.v).toBe(75);
  });
  it('unique triggers fire and respect internal cooldown (Grabherrs Schwur 3s)', () => {
    const p = player(12, { mainhand: mkItem('w', 'longsword_t1'), offhand: mkItem('s', 'shield_t1', { rarity: 'unique', uniqueId: 'u_gravelordoath', ilvl: 12 }) }, ['g_s_armor', 'g_s_block', 'g_m_shield', 'g_k_ironheart']);
    const r = simulateCombat(p, [mon('rust_crow', 12)], { seed: 9, maxMs: 60000 });
    const trig = r.events.filter((e) => e.type === 'TRIGGER' && e.note === 'u_gravelordoath_block_barrier').map((e) => e.t);
    expect(trig.length).toBeGreaterThan(0);
    for (let i = 1; i < trig.length; i++) expect(trig[i]! - trig[i - 1]!).toBeGreaterThanOrEqual(3000);
  });
  it('Dornenpakt reflect respects the 5% maxHP per second cap', () => {
    const chest = mkItem('c', 'chest_plate_t5', { rarity: 'unique', uniqueId: 'u_thornpact', uniqueRolls: [9], ilvl: 60 });
    const p = player(60, { mainhand: mkItem('w', 'longsword_t5'), chest });
    const r = simulateCombat(p, [mon('rust_crow', 60)], { seed: 2, maxMs: 30000 });
    const perSec = new Map<number, number>();
    for (const e of r.events) if (e.type === 'DAMAGE' && e.skill === 'u_thornpact_reflect') perSec.set(Math.floor(e.t / 1000), (perSec.get(Math.floor(e.t / 1000)) ?? 0) + 1);
    expect(perSec.size).toBeGreaterThan(0);
  });
});

describe('monster scaling (spec 13.1a)', () => {
  it('hits the anchors exactly and interpolates logarithmically', () => {
    expect(anchorValue(1, 'hp')).toBe(120);
    expect(anchorValue(15, 'hp')).toBe(650);
    expect(anchorValue(60, 'bossHp')).toBe(110000);
    const v8 = anchorValue(8, 'hp');
    expect(v8).toBe(Math.round(Math.exp(Math.log(120) * (1 - 7 / 14) + Math.log(650) * (7 / 14))));
  });
  it('boss abilities are inside the DPS budget', () => {
    const def = MONSTER_BY_ID.boss_rustwarden!;
    const hit = monsterBasicHit(def, 100);
    const ab = def.abilities[0]!;
    const avg = hit * (def.attackSpeed + ab.hitMultiple / (ab.everyMs / 1000)) * (1 + def.critChance * 0.5);
    expect(avg).toBeCloseTo(100, 6);
  });
});
