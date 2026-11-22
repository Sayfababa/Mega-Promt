/**
 * Item bases (spec section 4). Tier-1 values from the spec tables; higher tiers are
 * derived: weapon base damage * weaponTierMult (roundHalfUp), APS/crit unchanged;
 * armour * armourTierMult * material share.
 */
import { B } from '../balance';
import { roundHalfUp } from '../../engine/core/fixedPoint';
import type { AffixCategory, ItemBase, ItemKind, Modifier } from '../../engine/types';

interface WeaponFamily {
  id: string;
  name: string;
  hands: 1 | 2;
  min: number;
  max: number;
  aps: number;
  crit: number;
  caster: boolean;
  martial: boolean;
  implicits: Modifier[];
  implicitText: string;
}

const WEAPON_FAMILIES: WeaponFamily[] = [
  { id: 'dagger', name: 'Dolch', hands: 1, min: 8, max: 13, aps: 1.55, crit: 0.08, caster: false, martial: true, implicits: [{ type: 'stat', stat: 'critChance', value: 0.05, cond: 'targetBleeding' }], implicitText: '+5 Prozentpunkte Krit-Chance gegen blutende Ziele' },
  { id: 'shortsword', name: 'Kurzschwert', hands: 1, min: 12, max: 18, aps: 1.2, crit: 0.05, caster: false, martial: true, implicits: [{ type: 'inc', tags: ['ATTACK', 'PHYSICAL'], value: 0.08 }], implicitText: '+8% erhöhter physischer Angriffsschaden' },
  { id: 'longsword', name: 'Langschwert', hands: 1, min: 14, max: 21, aps: 1.05, crit: 0.05, caster: false, martial: true, implicits: [{ type: 'stat', stat: 'blockPower', value: 0.10, cond: 'withShield' }], implicitText: '+10% Blockstärke bei Schildeinsatz' },
  { id: 'waraxe', name: 'Kriegsaxt', hands: 1, min: 16, max: 25, aps: 0.95, crit: 0.05, caster: false, martial: true, implicits: [{ type: 'stat', stat: 'bleedDuration', value: 0.15 }], implicitText: '+15% Blutungsdauer' },
  { id: 'mace', name: 'Streitkolben', hands: 1, min: 17, max: 27, aps: 0.9, crit: 0.05, caster: false, martial: true, implicits: [{ type: 'stat', stat: 'armorPen', value: 0.12 }], implicitText: '+12% Rüstungsdurchdringung für Waffentreffer' },
  { id: 'spear', name: 'Speer', hands: 2, min: 22, max: 32, aps: 0.96, crit: 0.06, caster: false, martial: true, implicits: [{ type: 'stat', stat: 'critChance', value: 0.05, cond: 'targetIsBoss' }], implicitText: '+5 Prozentpunkte Krit-Chance gegen Bosse' },
  { id: 'greatsword', name: 'Zweihandschwert', hands: 2, min: 24, max: 36, aps: 0.84, crit: 0.05, caster: false, martial: true, implicits: [{ type: 'inc', tags: [], value: 0.12, cond: 'selfHpAbove70' }], implicitText: '+12% erhöhter Schaden bei LP über 70%' },
  { id: 'greataxe', name: 'Zweihandaxt', hands: 2, min: 28, max: 42, aps: 0.74, crit: 0.05, caster: false, martial: true, implicits: [{ type: 'inc', tags: ['BLEED'], value: 0.18 }], implicitText: '+18% erhöhter Blutungsschaden' },
  { id: 'warhammer', name: 'Kriegshammer', hands: 2, min: 33, max: 49, aps: 0.64, crit: 0.05, caster: false, martial: true, implicits: [{ type: 'inc', tags: ['PHYSICAL'], value: 0.18, cond: 'targetHasBarrier' }], implicitText: '+18% erhöhter physischer Schaden gegen Ziele mit Barriere' },
  { id: 'bow', name: 'Bogen', hands: 2, min: 19, max: 29, aps: 1.08, crit: 0.07, caster: false, martial: true, implicits: [{ type: 'inc', tags: ['POISON'], value: 0.12 }], implicitText: '+12% erhöhter Giftschaden' },
  { id: 'crossbow', name: 'Armbrust', hands: 2, min: 30, max: 43, aps: 0.70, crit: 0.06, caster: false, martial: true, implicits: [{ type: 'stat', stat: 'critMulti', value: 0.15 }], implicitText: '+15 Prozentpunkte Krit-Multiplikator' },
  { id: 'claws', name: 'Krallen', hands: 1, min: 9, max: 15, aps: 1.42, crit: 0.07, caster: false, martial: true, implicits: [{ type: 'stat', stat: 'poisonChance', value: 0.10 }], implicitText: '+10% Auslösechance für Gift' },
  { id: 'wand', name: 'Zauberstab', hands: 1, min: 6, max: 10, aps: 1.15, crit: 0.05, caster: true, martial: false, implicits: [{ type: 'inc', tags: ['SPELL'], value: 0.12 }], implicitText: '+12% erhöhter Zauberschaden' },
  { id: 'staff', name: 'Magierstab', hands: 2, min: 9, max: 16, aps: 0.90, crit: 0.05, caster: true, martial: false, implicits: [{ type: 'inc', tags: ['SPELL'], value: 0.35 }], implicitText: '+35% erhöhter Zauberschaden' },
  { id: 'sceptre', name: 'Ritualzepter', hands: 1, min: 10, max: 15, aps: 1.0, crit: 0.05, caster: true, martial: false, implicits: [{ type: 'inc', tags: ['DOT'], value: 0.12 }], implicitText: '+12% erhöhte DoT-Wirkung' },
  { id: 'runeblade', name: 'Runenklinge', hands: 1, min: 11, max: 17, aps: 1.15, crit: 0.06, caster: true, martial: true, implicits: [{ type: 'inc', tags: ['ELEMENTAL'], value: 0.08 }], implicitText: '+8% erhöhter Elementarschaden' },
];

/** grammatically neutral tier prefixes (compound words) */
const TIER_NAMES = ['Rost', 'Eisen', 'Stahl', 'Meister', 'Abgrund', 'Ur'];

function tierName(base: string, tier: number): string {
  return `${TIER_NAMES[tier - 1]}-${base}`;
}

const weaponBases: ItemBase[] = [];
for (const f of WEAPON_FAMILIES) {
  for (let t = 1; t <= 6; t++) {
    const m = B.weaponTierMult[t - 1]!;
    const cats: AffixCategory[] = [];
    if (f.martial) cats.push('M');
    if (f.caster) cats.push('C');
    weaponBases.push({
      id: `${f.id}_t${t}`,
      name: tierName(f.name, t),
      familyId: f.id,
      kind: f.hands === 2 ? 'weapon2h' : 'weapon1h',
      group: 'weapon',
      categories: cats,
      tier: t,
      minLevel: B.baseTierMinLevel[t - 1]!,
      weapon: { min: roundHalfUp(f.min * m), max: roundHalfUp(f.max * m), aps: f.aps, crit: f.crit, hands: f.hands, casterEligible: f.caster },
      implicits: f.implicits,
      implicitText: f.implicitText,
      icon: `items/weapons/${f.id}`,
    });
  }
}

// ---------------------------------------------------------------- armour
const ARMOUR_SLOTS: { kind: ItemKind; name: string; base: number; leatherEva: number; clothMana: number }[] = [
  { kind: 'helm', name: 'Helm', base: 15, leatherEva: 0.02, clothMana: 0.04 },
  { kind: 'chest', name: 'Brustpanzer', base: 45, leatherEva: 0.04, clothMana: 0.06 },
  { kind: 'gloves', name: 'Handschuhe', base: 10, leatherEva: 0.02, clothMana: 0.03 },
  { kind: 'boots', name: 'Stiefel', base: 12, leatherEva: 0.02, clothMana: 0.03 },
];
const MATERIALS = [
  { id: 'plate', name: 'Platten', share: 1.0 },
  { id: 'leather', name: 'Leder', share: 0.55 },
  { id: 'cloth', name: 'Stoff', share: 0.25 },
] as const;

const armourBases: ItemBase[] = [];
for (const s of ARMOUR_SLOTS) {
  for (const mat of MATERIALS) {
    for (let t = 1; t <= 6; t++) {
      const implicits: Modifier[] = [];
      let implicitText = '';
      if (mat.id === 'leather') {
        implicits.push({ type: 'stat', stat: 'evasion', value: s.leatherEva });
        implicitText = `+${s.leatherEva * 100} Prozentpunkte Ausweichchance`;
      } else if (mat.id === 'cloth') {
        implicits.push({ type: 'stat', stat: 'incMana', value: s.clothMana });
        implicitText = `+${s.clothMana * 100}% erhöhtes maximales Mana`;
      }
      armourBases.push({
        id: `${s.kind}_${mat.id}_t${t}`,
        name: `${TIER_NAMES[t - 1]}-${mat.name}${s.name.toLowerCase()}`,
        familyId: `${s.kind}_${mat.id}`,
        kind: s.kind,
        group: 'armour',
        categories: ['A'],
        tier: t,
        minLevel: B.baseTierMinLevel[t - 1]!,
        armour: roundHalfUp(s.base * B.armourTierMult[t - 1]! * mat.share),
        material: mat.id,
        implicits,
        implicitText,
        icon: `items/armour/${s.kind}_${mat.id}`,
      });
    }
  }
}
// belt (spec: base armour 8, +5% max life)
for (let t = 1; t <= 6; t++) {
  armourBases.push({
    id: `belt_t${t}`, name: tierName('Gürtel', t), familyId: 'belt', kind: 'belt', group: 'armour', categories: ['B'],
    tier: t, minLevel: B.baseTierMinLevel[t - 1]!, armour: roundHalfUp(8 * B.armourTierMult[t - 1]!),
    implicits: [{ type: 'stat', stat: 'incMaxHP', value: 0.05 }], implicitText: '+5% erhöhte maximale Lebenspunkte', icon: 'items/armour/belt',
  });
}
// offhands
for (let t = 1; t <= 6; t++) {
  const lvl = B.baseTierMinLevel[t - 1]!;
  armourBases.push({
    id: `shield_t${t}`, name: tierName('Schild', t), familyId: 'shield', kind: 'offhand', group: 'armour', categories: ['O'], tier: t, minLevel: lvl,
    armour: roundHalfUp(35 * B.armourTierMult[t - 1]!), offhandKind: 'shield',
    implicits: [{ type: 'stat', stat: 'blockChance', value: 0.09 }, { type: 'stat', stat: 'blockPower', value: 0.15 }],
    implicitText: '+9 Prozentpunkte Blockchance, +15% Blockstärke', icon: 'items/offhand/shield',
  });
  armourBases.push({
    id: `focus_t${t}`, name: tierName('Fokus', t), familyId: 'focus', kind: 'offhand', group: 'armour', categories: ['O'], tier: t, minLevel: lvl,
    offhandKind: 'focus',
    implicits: [{ type: 'inc', tags: ['SPELL'], value: 0.10 }, { type: 'stat', stat: 'manaRegen', value: 0.08 }],
    implicitText: '+10% Zauberschaden, +8% Mana-Regeneration', icon: 'items/offhand/focus',
  });
  armourBases.push({
    id: `totem_t${t}`, name: tierName('Totem', t), familyId: 'totem', kind: 'offhand', group: 'armour', categories: ['O'], tier: t, minLevel: lvl,
    offhandKind: 'totem',
    implicits: [{ type: 'inc', tags: ['DOT'], value: 0.10 }, { type: 'stat', stat: 'curseDuration', value: 0.10 }],
    implicitText: '+10% DoT-Schaden, +10% Fluchdauer', icon: 'items/offhand/totem',
  });
}

// ---------------------------------------------------------------- jewellery (no tiers, minLevel 1)
const jewelleryBases: ItemBase[] = [
  { id: 'ring_ruby', name: 'Rubinring', familyId: 'ring_ruby', kind: 'ring', group: 'jewellery', categories: ['J'], tier: 1, minLevel: 1, implicits: [{ type: 'stat', stat: 'resFire', value: 0.12 }], implicitText: '+12% Feuerresistenz', icon: 'items/jewellery/ring_ruby' },
  { id: 'ring_sapphire', name: 'Saphirring', familyId: 'ring_sapphire', kind: 'ring', group: 'jewellery', categories: ['J'], tier: 1, minLevel: 1, implicits: [{ type: 'stat', stat: 'resCold', value: 0.12 }], implicitText: '+12% Frostresistenz', icon: 'items/jewellery/ring_sapphire' },
  { id: 'ring_topaz', name: 'Topasring', familyId: 'ring_topaz', kind: 'ring', group: 'jewellery', categories: ['J'], tier: 1, minLevel: 1, implicits: [{ type: 'stat', stat: 'resLightning', value: 0.12 }], implicitText: '+12% Blitzresistenz', icon: 'items/jewellery/ring_topaz' },
  { id: 'ring_onyx', name: 'Onyxring', familyId: 'ring_onyx', kind: 'ring', group: 'jewellery', categories: ['J'], tier: 1, minLevel: 1, implicits: [{ type: 'stat', stat: 'resShadow', value: 0.10 }], implicitText: '+10% Schattenresistenz', icon: 'items/jewellery/ring_onyx' },
  // D-086: "+8% eines wählbaren Hauptattributs" → four amulet bases, attribute fixed per base
  { id: 'amulet_str', name: 'Amulett der Kraft', familyId: 'amulet_str', kind: 'amulet', group: 'jewellery', categories: ['J'], tier: 1, minLevel: 1, implicits: [{ type: 'stat', stat: 'incStr', value: 0.08 }], implicitText: '+8% erhöhte Stärke', icon: 'items/jewellery/amulet_str' },
  { id: 'amulet_dex', name: 'Amulett der Gewandtheit', familyId: 'amulet_dex', kind: 'amulet', group: 'jewellery', categories: ['J'], tier: 1, minLevel: 1, implicits: [{ type: 'stat', stat: 'incDex', value: 0.08 }], implicitText: '+8% erhöhtes Geschick', icon: 'items/jewellery/amulet_dex' },
  { id: 'amulet_int', name: 'Amulett der Einsicht', familyId: 'amulet_int', kind: 'amulet', group: 'jewellery', categories: ['J'], tier: 1, minLevel: 1, implicits: [{ type: 'stat', stat: 'incInt', value: 0.08 }], implicitText: '+8% erhöhte Intelligenz', icon: 'items/jewellery/amulet_int' },
  { id: 'amulet_vit', name: 'Amulett der Lebenskraft', familyId: 'amulet_vit', kind: 'amulet', group: 'jewellery', categories: ['J'], tier: 1, minLevel: 1, implicits: [{ type: 'stat', stat: 'incVit', value: 0.08 }], implicitText: '+8% erhöhte Vitalität', icon: 'items/jewellery/amulet_vit' },
];

export const BASES: ItemBase[] = [...weaponBases, ...armourBases, ...jewelleryBases];
export const BASE_BY_ID: Record<string, ItemBase> = Object.fromEntries(BASES.map((b) => [b.id, b]));
export const WEAPON_FAMILY_DATA = WEAPON_FAMILIES;

export function getBase(id: string): ItemBase {
  const b = BASE_BY_ID[id];
  if (!b) throw new Error(`Unknown base ${id}`);
  return b;
}
