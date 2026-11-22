/**
 * Read-only view helpers: names, icons, stat summaries and REAL comparison deltas via engine aggregate().
 * No gameplay rules are decided here; the engine validates every action.
 */
import { getBase } from '../content/bases/bases';
import { UNIQUE_BY_ID } from '../content/uniques/uniques';
import { aggregate, type DerivedStats } from '../engine/stats/aggregate';
import { equippedItems } from '../engine/state/commands';
import type { GameState } from '../engine/state/gameState';
import type { EquipSlot, ItemInstance } from '../engine/types';
import { ATTR_LABEL, DTYPE_LABEL } from './labels';

export function itemName(item: ItemInstance): string {
  if (item.uniqueId) return UNIQUE_BY_ID[item.uniqueId]?.name ?? item.uniqueId;
  return getBase(item.baseId).name;
}

export function itemIcon(item: ItemInstance): string {
  if (item.uniqueId) return UNIQUE_BY_ID[item.uniqueId]?.icon ?? getBase(item.baseId).icon;
  return getBase(item.baseId).icon;
}

/** equipment slots an item fits into (display; EQUIP_ITEM validates) */
export function slotsForItem(item: ItemInstance): EquipSlot[] {
  const k = getBase(item.baseId).kind;
  if (k === 'weapon1h' || k === 'weapon2h') return ['mainhand'];
  if (k === 'ring') return ['ringA', 'ringB'];
  return [k as EquipSlot];
}

/** slot that EQUIP_ITEM without explicit slot would use: first empty allowed slot, else the first */
export function defaultSlotFor(state: GameState, item: ItemInstance): EquipSlot {
  const allowed = slotsForItem(item);
  return allowed.find((s) => !state.character?.equipment[s]) ?? allowed[0]!;
}

export interface StatLine {
  key: string;
  label: string;
  value: number;
  kind: 'int' | 'pct' | 'dec1' | 'dec2';
}

const TAG_DE: Record<string, string> = {
  ATTACK: 'Angriff', SPELL: 'Zauber', MELEE: 'Nahkampf', PHYSICAL: 'physisch', FIRE: 'Feuer', COLD: 'Frost', LIGHTNING: 'Blitz', SHADOW: 'Schatten',
  ELEMENTAL: 'Elementar', DOT: 'DoT', BLEED: 'Blutung', POISON: 'Gift', BURN: 'Brand', FINISHER: 'Finisher',
};

export function weaponDps(d: DerivedStats): number {
  return ((d.weapon.min + d.weapon.max) / 2) * d.weapon.aps;
}

/** flat list of the main character numbers taken directly from DerivedStats */
export function statSummary(d: DerivedStats): StatLine[] {
  const s = d.stats;
  const out: StatLine[] = [
    { key: 'maxHP', label: 'Maximale LP', value: d.maxHP, kind: 'int' },
    { key: 'maxMana', label: 'Maximales Mana', value: d.maxMana, kind: 'int' },
    { key: 'armorFlat', label: 'Rüstung (Grundwert)', value: d.armorFlat, kind: 'int' },
    { key: 'incArmor', label: 'Erhöhte Rüstung', value: s.incArmor ?? 0, kind: 'pct' },
    { key: 'str', label: ATTR_LABEL.str, value: d.str, kind: 'int' },
    { key: 'dex', label: ATTR_LABEL.dex, value: d.dex, kind: 'int' },
    { key: 'int', label: ATTR_LABEL.int, value: d.int, kind: 'int' },
    { key: 'vit', label: ATTR_LABEL.vit, value: d.vit, kind: 'int' },
    { key: 'wdps', label: 'Waffen-DPS (lokal, ohne Skills)', value: weaponDps(d), kind: 'dec1' },
    { key: 'wmin', label: 'Waffenschaden min', value: d.weapon.min, kind: 'dec1' },
    { key: 'wmax', label: 'Waffenschaden max', value: d.weapon.max, kind: 'dec1' },
    { key: 'aps', label: 'Angriffe/s (Waffe)', value: d.weapon.aps, kind: 'dec2' },
    { key: 'attackSpeed', label: 'Erhöhte Angriffsgeschw.', value: s.attackSpeed ?? 0, kind: 'pct' },
    { key: 'crit', label: 'Krit-Chance (Waffe + global, vor Cap)', value: d.weapon.crit + (s.critChance ?? 0), kind: 'pct' },
    { key: 'critMulti', label: 'Krit-Multiplikator Bonus', value: s.critMulti ?? 0, kind: 'pct' },
    { key: 'blockChance', label: 'Blockchance (vor Cap)', value: s.blockChance ?? 0, kind: 'pct' },
    { key: 'blockPower', label: 'Blockstärke', value: s.blockPower ?? 0, kind: 'pct' },
    { key: 'evasion', label: 'Ausweichen', value: s.evasion ?? 0, kind: 'pct' },
    { key: 'resFire', label: `${DTYPE_LABEL.fire}resistenz`, value: (s.resFire ?? 0) + (s.resAll ?? 0), kind: 'pct' },
    { key: 'resCold', label: `${DTYPE_LABEL.cold}resistenz`, value: (s.resCold ?? 0) + (s.resAll ?? 0), kind: 'pct' },
    { key: 'resLightning', label: `${DTYPE_LABEL.lightning}resistenz`, value: (s.resLightning ?? 0) + (s.resAll ?? 0), kind: 'pct' },
    { key: 'resShadow', label: `${DTYPE_LABEL.shadow}resistenz`, value: (s.resShadow ?? 0) + (s.resAll ?? 0), kind: 'pct' },
    { key: 'bleedChance', label: 'Blutungschance (Angriffe)', value: s.bleedChance ?? 0, kind: 'pct' },
    { key: 'lifeLeech', label: 'Lebensraub', value: s.lifeLeech ?? 0, kind: 'pct' },
    { key: 'hpRegen', label: 'LP-Regeneration/s', value: d.hpRegen, kind: 'dec1' },
    { key: 'manaRegen', label: 'Mana-Regeneration/s', value: d.manaRegen, kind: 'dec1' },
    { key: 'magicFind', label: 'Magiefund', value: s.magicFind ?? 0, kind: 'pct' },
    { key: 'goldFind', label: 'Goldfund', value: s.goldFind ?? 0, kind: 'pct' },
  ];
  for (const el of ['fire', 'cold', 'lightning'] as const) {
    const e = d.weapon.elemental[el];
    if (e) out.push({ key: `w_${el}`, label: `${DTYPE_LABEL[el]}schaden Waffe (Ø)`, value: (e.min + e.max) / 2, kind: 'dec1' });
  }
  // unconditional increased-damage modifiers grouped by tag set
  const inc = new Map<string, number>();
  for (const m of d.incMods) {
    if (m.cond) continue;
    const key = m.tags.length ? m.tags.map((t) => TAG_DE[t] ?? t).join('+') : 'allgemein';
    inc.set(key, (inc.get(key) ?? 0) + m.value);
  }
  for (const [k, v] of inc) out.push({ key: `inc_${k}`, label: `Erhöhter Schaden (${k})`, value: v, kind: 'pct' });
  return out;
}

export function formatStat(l: Pick<StatLine, 'kind'>, v: number, signed = false): string {
  const sign = signed && v > 0 ? '+' : '';
  switch (l.kind) {
    case 'int': return `${sign}${Math.round(v)}`;
    case 'pct': return `${sign}${(v * 100).toFixed(1).replace('.', ',')}%`;
    case 'dec1': return `${sign}${v.toFixed(1).replace('.', ',')}`;
    case 'dec2': return `${sign}${v.toFixed(2).replace('.', ',')}`;
  }
}

export interface Comparison {
  slot: EquipSlot;
  current: ItemInstance | null;
  deltas: (StatLine & { delta: number })[];
  removesOffhand: boolean;
}

/** real stat deltas: character aggregated with the item hypothetically equipped vs. now */
export function compareItem(state: GameState, item: ItemInstance, slot: EquipSlot = defaultSlotFor(state, item)): Comparison | null {
  const c = state.character;
  if (!c) return null;
  const eq = equippedItems(state);
  const input = { classId: c.classId, level: c.level, allocated: c.allocated, passives: c.passives };
  const before = aggregate({ ...input, equipment: eq });
  const hyp: Partial<Record<EquipSlot, ItemInstance>> = { ...eq, [slot]: item };
  let removesOffhand = false;
  const base = getBase(item.baseId);
  if (slot === 'mainhand' && base.weapon?.hands === 2 && hyp.offhand) {
    delete hyp.offhand;
    removesOffhand = true;
  }
  const after = aggregate({ ...input, equipment: hyp });
  const a = statSummary(before);
  const b = statSummary(after);
  const keys = new Set([...a.map((x) => x.key), ...b.map((x) => x.key)]);
  const deltas: Comparison['deltas'] = [];
  for (const k of keys) {
    const la = a.find((x) => x.key === k);
    const lb = b.find((x) => x.key === k);
    const line = (lb ?? la)!;
    const delta = (lb?.value ?? 0) - (la?.value ?? 0);
    if (Math.abs(delta) > 1e-9) deltas.push({ ...line, delta });
  }
  return { slot, current: eq[slot] ?? null, deltas, removesOffhand };
}
