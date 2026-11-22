import { aggregate, weaponProfile } from '../../engine/stats/aggregate';
import { physicalReduction, effectiveResistance, capCrit, capCritMulti } from '../../engine/stats/mitigation';
import { mkItem } from '../fixtures/items';

const none = { str: 0, dex: 0, int: 0, vit: 0 };

describe('stat aggregation (spec 3.1)', () => {
  it('Wächter L1 base values follow the exact formulas', () => {
    const d = aggregate({ classId: 'guardian', level: 1, allocated: none, equipment: {}, passives: [] });
    expect([d.str, d.dex, d.int, d.vit]).toEqual([15, 10, 7, 15]);
    expect(d.maxHP).toBe(100 + 14 * 15);
    expect(d.maxMana).toBe(60 + 4 * 7);
    expect(d.manaRegen).toBeCloseTo(2 + 0.015 * 88, 10);
    expect(d.hpRegen).toBeCloseTo(0.005 * 310, 10);
  });
  it('level ups add class attributes and allocated points', () => {
    const d = aggregate({ classId: 'guardian', level: 10, allocated: { str: 4, dex: 0, int: 0, vit: 14 }, equipment: {}, passives: [] });
    expect(d.str).toBe(15 + 9 + 4);
    expect(d.vit).toBe(15 + 9 + 14);
    expect(d.maxHP).toBe(Math.floor(100 + 12 * 9 + 14 * d.vit));
  });
  it('local physical % applies to the weapon only (spec 3.2)', () => {
    const w = mkItem('w', 'shortsword_t1', { rarity: 'magic', ilvl: 40, prefixes: [{ familyId: 'p01', tier: 3, values: [100] }] });
    const p = weaponProfile(w);
    expect(p.min).toBeCloseTo(24);
    expect(p.max).toBeCloseTo(36);
    const d = aggregate({ classId: 'guardian', level: 1, allocated: none, equipment: { mainhand: w }, passives: [] });
    // no global increased spell / physical entry created from a local affix
    expect(d.incMods.some((m) => m.tags.includes('SPELL') && m.value > 0.01)).toBe(false);
  });
  it('local flat damage is added before local %', () => {
    const w = mkItem('w', 'shortsword_t1', { rarity: 'rare', ilvl: 40, prefixes: [{ familyId: 'p02', tier: 3, values: [10, 15] }, { familyId: 'p01', tier: 3, values: [50] }] });
    const p = weaponProfile(w);
    expect(p.min).toBeCloseTo((12 + 10) * 1.5);
    expect(p.max).toBeCloseTo((18 + 15) * 1.5);
  });
  it('two-hander ignores an offhand for aggregation', () => {
    const d = aggregate({ classId: 'guardian', level: 1, allocated: none, equipment: { mainhand: mkItem('w', 'greataxe_t1'), offhand: mkItem('s', 'shield_t1') }, passives: [] });
    expect(d.hasShield).toBe(false);
    expect(d.stats.blockChance ?? 0).toBe(0);
  });
  it('shield adds block chance and armour', () => {
    const d = aggregate({ classId: 'guardian', level: 1, allocated: none, equipment: { mainhand: mkItem('w', 'longsword_t1'), offhand: mkItem('s', 'shield_t1') }, passives: [] });
    expect(d.hasShield).toBe(true);
    expect(d.stats.blockChance).toBeCloseTo(0.09);
    expect(d.armorFlat).toBe(35);
  });
  it('unique rolls scale their referenced modifier', () => {
    const u = mkItem('u', 'greatsword_t5', { rarity: 'unique', ilvl: 70, uniqueId: 'u_bloodthirst', uniqueRolls: [30] });
    const d = aggregate({ classId: 'guardian', level: 60, allocated: none, equipment: { mainhand: u }, passives: [] });
    expect(d.incMods.some((m) => m.tags.join() === 'BLEED' && Math.abs(m.value - 0.30) < 1e-9)).toBe(true);
    expect(d.triggers.map((t) => t.effectId)).toContain('u_bloodthirst_crit_bleed');
  });
  it('passive key nodes apply their trade-offs', () => {
    const base = aggregate({ classId: 'guardian', level: 15, allocated: none, equipment: {}, passives: [] });
    const d = aggregate({ classId: 'guardian', level: 15, allocated: none, equipment: {}, passives: ['g_k_berserker'] });
    expect(d.maxHP).toBe(Math.floor(base.maxHP * 0.9));
  });
});

describe('mitigation (spec 3.3)', () => {
  it('armour formula and cap', () => {
    expect(physicalReduction(450, 0)).toBeCloseTo(0.5);
    expect(physicalReduction(1e9, 1)).toBe(0.7);
    expect(physicalReduction(0, 10)).toBe(0);
  });
  it('resistance caps and penetration on uncapped value', () => {
    expect(effectiveResistance(0.9, 0)).toBe(0.75);
    expect(effectiveResistance(0.9, 0.1)).toBeCloseTo(0.75);
    expect(effectiveResistance(0.9, 0.2)).toBeCloseTo(0.70);
    expect(effectiveResistance(-1, 0)).toBe(-0.5);
  });
  it('crit caps', () => {
    expect(capCrit(0.01)).toBe(0.05);
    expect(capCrit(0.9)).toBe(0.55);
    expect(capCritMulti(5)).toBe(3.0);
  });
});
