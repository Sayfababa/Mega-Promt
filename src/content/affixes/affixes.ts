/**
 * Start affix catalogue (spec section 6). Values are T3 reference intervals;
 * other tiers are derived via B.affixTierFactor (spec: "klarer Initialgenerator").
 * Two-number flat damage families ("+A–B bis +C–D") roll min in [A,C] and max in [B,D]
 * independently with min<=max enforced (D-039).
 */
import type { AffixFamily, AffixCategory, EssenceType, ModTemplate, RollDef } from '../../engine/types';

const pct = (min: number, max: number): RollDef => ({ min, max, unit: 'dec1' });
const int = (min: number, max: number): RollDef => ({ min, max, unit: 'int' });

interface Def {
  id: string;
  side: 'prefix' | 'suffix';
  name: string;
  text: string;
  cats: AffixCategory[];
  weight: number;
  rolls: RollDef[];
  mods: ModTemplate[];
  tags: string[];
  essence?: EssenceType[];
  minItemLevel?: number;
  noTiers?: boolean;
}

const P = 0.01;

const defs: Def[] = [
  // ------------------------------------------------------------- prefixes
  { id: 'p01', side: 'prefix', name: 'Lokaler physischer Schaden %', text: '+{0}% erhöhter physischer Schaden (lokal)', cats: ['M'], weight: 90, rolls: [pct(70, 100)], mods: [{ type: 'local', stat: 'physInc', roll: 0, scale: P }], tags: ['LOCAL_WEAPON_DAMAGE'], essence: ['power'] },
  { id: 'p02', side: 'prefix', name: 'Lokaler physischer Flachschaden', text: 'Fügt {0}–{1} physischen Schaden hinzu (lokal)', cats: ['M'], weight: 85, rolls: [int(7, 12), int(12, 20)], mods: [{ type: 'local', stat: 'physFlatMin', roll: 0, scale: 1 }, { type: 'local', stat: 'physFlatMax', roll: 1, scale: 1 }], tags: ['LOCAL_WEAPON_FLAT'], essence: ['power'] },
  { id: 'p03', side: 'prefix', name: 'Lokaler Feuer-Flachschaden', text: 'Fügt {0}–{1} Feuerschaden hinzu (lokal)', cats: ['M'], weight: 65, rolls: [int(6, 11), int(10, 18)], mods: [{ type: 'local', stat: 'fireFlatMin', roll: 0, scale: 1 }, { type: 'local', stat: 'fireFlatMax', roll: 1, scale: 1 }], tags: ['LOCAL_FIRE_ATTACK'], essence: ['ash'] },
  { id: 'p04', side: 'prefix', name: 'Lokaler Frost-Flachschaden', text: 'Fügt {0}–{1} Frostschaden hinzu (lokal)', cats: ['M'], weight: 65, rolls: [int(6, 11), int(10, 18)], mods: [{ type: 'local', stat: 'coldFlatMin', roll: 0, scale: 1 }, { type: 'local', stat: 'coldFlatMax', roll: 1, scale: 1 }], tags: ['LOCAL_COLD_ATTACK'] },
  { id: 'p05', side: 'prefix', name: 'Lokaler Blitz-Flachschaden', text: 'Fügt {0}–{1} Blitzschaden hinzu (lokal)', cats: ['M'], weight: 65, rolls: [int(4, 8), int(14, 23)], mods: [{ type: 'local', stat: 'lightningFlatMin', roll: 0, scale: 1 }, { type: 'local', stat: 'lightningFlatMax', roll: 1, scale: 1 }], tags: ['LOCAL_LIGHTNING_ATTACK'], essence: ['spark'] },
  { id: 'p06', side: 'prefix', name: 'Zauberschaden %', text: '+{0}% erhöhter Zauberschaden', cats: ['C', 'J', 'R'], weight: 80, rolls: [pct(15, 24)], mods: [{ type: 'inc', tags: ['SPELL'], roll: 0, scale: P }], tags: ['GLOBAL_SPELL'] },
  { id: 'p07', side: 'prefix', name: 'Physischer Schaden % (global)', text: '+{0}% erhöhter physischer Schaden', cats: ['J', 'R', 'B'], weight: 75, rolls: [pct(14, 22)], mods: [{ type: 'inc', tags: ['PHYSICAL'], roll: 0, scale: P }], tags: ['GLOBAL_PHYSICAL'], essence: ['power'] },
  { id: 'p08', side: 'prefix', name: 'Elementarschaden %', text: '+{0}% erhöhter Elementarschaden', cats: ['C', 'J', 'R'], weight: 75, rolls: [pct(15, 22)], mods: [{ type: 'inc', tags: ['ELEMENTAL'], roll: 0, scale: P }], tags: ['GLOBAL_ELEMENTAL'] },
  { id: 'p09', side: 'prefix', name: 'Feuerschaden %', text: '+{0}% erhöhter Feuerschaden', cats: ['C', 'J', 'R'], weight: 70, rolls: [pct(20, 30)], mods: [{ type: 'inc', tags: ['FIRE'], roll: 0, scale: P }], tags: ['GLOBAL_FIRE'], essence: ['ash'] },
  { id: 'p10', side: 'prefix', name: 'Frostschaden %', text: '+{0}% erhöhter Frostschaden', cats: ['C', 'J', 'R'], weight: 70, rolls: [pct(20, 30)], mods: [{ type: 'inc', tags: ['COLD'], roll: 0, scale: P }], tags: ['GLOBAL_COLD'] },
  { id: 'p11', side: 'prefix', name: 'Blitzschaden %', text: '+{0}% erhöhter Blitzschaden', cats: ['C', 'J', 'R'], weight: 70, rolls: [pct(20, 30)], mods: [{ type: 'inc', tags: ['LIGHTNING'], roll: 0, scale: P }], tags: ['GLOBAL_LIGHTNING'], essence: ['spark'] },
  { id: 'p12', side: 'prefix', name: 'Schattenschaden %', text: '+{0}% erhöhter Schattenschaden', cats: ['C', 'J', 'R'], weight: 70, rolls: [pct(20, 30)], mods: [{ type: 'inc', tags: ['SHADOW'], roll: 0, scale: P }], tags: ['GLOBAL_SHADOW'] },
  { id: 'p13', side: 'prefix', name: 'Maximale Lebenspunkte', text: '+{0} maximale Lebenspunkte', cats: ['A', 'J', 'B', 'O', 'R'], weight: 95, rolls: [int(65, 105)], mods: [{ type: 'stat', stat: 'flatHP', roll: 0, scale: 1 }], tags: ['FLAT_HP'], essence: ['life'] },
  { id: 'p14', side: 'prefix', name: 'Maximales Mana', text: '+{0} maximales Mana', cats: ['A', 'J', 'B', 'O', 'R'], weight: 90, rolls: [int(55, 90)], mods: [{ type: 'stat', stat: 'flatMana', roll: 0, scale: 1 }], tags: ['FLAT_MANA'] },
  { id: 'p15', side: 'prefix', name: 'Lokale Rüstung %', text: '+{0}% erhöhte Rüstung (lokal)', cats: ['A', 'O'], weight: 90, rolls: [pct(55, 85)], mods: [{ type: 'local', stat: 'armorInc', roll: 0, scale: P }], tags: ['LOCAL_ARMOUR'], essence: ['warding'] },
  { id: 'p16', side: 'prefix', name: 'Maximale Barriere', text: '+{0} maximale Barriere', cats: ['A', 'O', 'R'], weight: 65, rolls: [int(50, 90)], mods: [{ type: 'stat', stat: 'flatBarrier', roll: 0, scale: 1 }], tags: ['FLAT_BARRIER'], essence: ['warding'] },
  { id: 'p17', side: 'prefix', name: 'Giftschaden %', text: '+{0}% erhöhter Giftschaden', cats: ['M', 'J', 'R'], weight: 65, rolls: [pct(20, 30)], mods: [{ type: 'inc', tags: ['POISON'], roll: 0, scale: P }], tags: ['GLOBAL_POISON'], essence: ['poison'] },
  { id: 'p18', side: 'prefix', name: 'Blutungsschaden %', text: '+{0}% erhöhter Blutungsschaden', cats: ['M', 'J', 'R'], weight: 65, rolls: [pct(20, 30)], mods: [{ type: 'inc', tags: ['BLEED'], roll: 0, scale: P }], tags: ['GLOBAL_BLEED'], essence: ['power'] },
  { id: 'p19', side: 'prefix', name: 'Dienerschaden %', text: '+{0}% erhöhter Dienerschaden', cats: ['C', 'J', 'R'], weight: 55, rolls: [pct(20, 35)], mods: [{ type: 'inc', tags: ['MINION'], roll: 0, scale: P }], tags: ['MINION_DAMAGE'] },
  { id: 'p20', side: 'prefix', name: 'Lebensregeneration', text: '+{0} Lebensregeneration pro Sekunde', cats: ['A', 'B', 'O'], weight: 80, rolls: [int(5, 9)], mods: [{ type: 'stat', stat: 'hpRegenFlat', roll: 0, scale: 1 }], tags: ['HP_REGEN'], essence: ['life'] },
  { id: 'p21', side: 'prefix', name: 'Fluchwirkung %', text: '+{0}% erhöhte Fluchwirkung', cats: ['C', 'R', 'J'], weight: 55, rolls: [pct(12, 20)], mods: [{ type: 'stat', stat: 'cursePower', roll: 0, scale: P }], tags: ['CURSE_POWER'] },
  { id: 'p22', side: 'prefix', name: 'Schutzschild-Effekt %', text: '+{0}% erhöhte Barrierewirkung', cats: ['O', 'R', 'A'], weight: 60, rolls: [pct(12, 20)], mods: [{ type: 'stat', stat: 'barrierPower', roll: 0, scale: P }], tags: ['BARRIER_POWER'], essence: ['warding'] },
  // ------------------------------------------------------------- suffixes
  { id: 's01', side: 'suffix', name: 'Stärke', text: '+{0} Stärke', cats: ['M', 'A', 'J', 'B', 'O'], weight: 100, rolls: [int(12, 19)], mods: [{ type: 'stat', stat: 'str', roll: 0, scale: 1 }], tags: ['ATTR_STR'], essence: ['power'] },
  { id: 's02', side: 'suffix', name: 'Geschick', text: '+{0} Geschick', cats: ['M', 'A', 'J', 'B', 'O'], weight: 100, rolls: [int(12, 19)], mods: [{ type: 'stat', stat: 'dex', roll: 0, scale: 1 }], tags: ['ATTR_DEX'] },
  { id: 's03', side: 'suffix', name: 'Intelligenz', text: '+{0} Intelligenz', cats: ['C', 'A', 'J', 'B', 'O'], weight: 100, rolls: [int(12, 19)], mods: [{ type: 'stat', stat: 'int', roll: 0, scale: 1 }], tags: ['ATTR_INT'] },
  { id: 's04', side: 'suffix', name: 'Vitalität', text: '+{0} Vitalität', cats: ['A', 'J', 'B', 'O', 'R'], weight: 100, rolls: [int(12, 19)], mods: [{ type: 'stat', stat: 'vit', roll: 0, scale: 1 }], tags: ['ATTR_VIT'], essence: ['life'] },
  { id: 's05', side: 'suffix', name: 'Angriffsgeschwindigkeit (lokal)', text: '+{0}% erhöhte Angriffsgeschwindigkeit (lokal)', cats: ['M'], weight: 80, rolls: [pct(9, 13)], mods: [{ type: 'local', stat: 'attackSpeed', roll: 0, scale: P }], tags: ['LOCAL_ATTACK_SPEED'] },
  { id: 's06', side: 'suffix', name: 'Angriffsgeschwindigkeit (global)', text: '+{0}% erhöhte Angriffsgeschwindigkeit', cats: ['J', 'B'], weight: 70, rolls: [pct(6, 10)], mods: [{ type: 'stat', stat: 'attackSpeed', roll: 0, scale: P }], tags: ['GLOBAL_ATTACK_SPEED'] },
  { id: 's07', side: 'suffix', name: 'Zaubergeschwindigkeit', text: '+{0}% erhöhte Zaubergeschwindigkeit', cats: ['C', 'J'], weight: 75, rolls: [pct(8, 13)], mods: [{ type: 'stat', stat: 'castSpeed', roll: 0, scale: P }], tags: ['CAST_SPEED'] },
  { id: 's08', side: 'suffix', name: 'Kritische Chance (lokal)', text: '+{0} Prozentpunkte kritische Trefferchance (lokal)', cats: ['M'], weight: 65, rolls: [pct(2, 3.5)], mods: [{ type: 'local', stat: 'crit', roll: 0, scale: P }], tags: ['LOCAL_CRIT'] },
  { id: 's09', side: 'suffix', name: 'Kritische Chance (global)', text: '+{0} Prozentpunkte kritische Trefferchance', cats: ['C', 'J', 'R'], weight: 60, rolls: [pct(2, 3)], mods: [{ type: 'stat', stat: 'critChance', roll: 0, scale: P }], tags: ['GLOBAL_CRIT'] },
  { id: 's10', side: 'suffix', name: 'Krit-Multiplikator', text: '+{0} Prozentpunkte Krit-Multiplikator', cats: ['M', 'C', 'J'], weight: 60, rolls: [pct(15, 24)], mods: [{ type: 'stat', stat: 'critMulti', roll: 0, scale: P }], tags: ['CRIT_MULT'] },
  { id: 's11', side: 'suffix', name: 'Feuerresistenz', text: '+{0}% Feuerresistenz', cats: ['A', 'J', 'B', 'O', 'R'], weight: 100, rolls: [pct(20, 28)], mods: [{ type: 'stat', stat: 'resFire', roll: 0, scale: P }], tags: ['RES_FIRE'] },
  { id: 's12', side: 'suffix', name: 'Frostresistenz', text: '+{0}% Frostresistenz', cats: ['A', 'J', 'B', 'O', 'R'], weight: 100, rolls: [pct(20, 28)], mods: [{ type: 'stat', stat: 'resCold', roll: 0, scale: P }], tags: ['RES_COLD'] },
  { id: 's13', side: 'suffix', name: 'Blitzresistenz', text: '+{0}% Blitzresistenz', cats: ['A', 'J', 'B', 'O', 'R'], weight: 100, rolls: [pct(20, 28)], mods: [{ type: 'stat', stat: 'resLightning', roll: 0, scale: P }], tags: ['RES_LIGHTNING'] },
  { id: 's14', side: 'suffix', name: 'Schattenresistenz', text: '+{0}% Schattenresistenz', cats: ['A', 'J', 'B', 'O', 'R'], weight: 100, rolls: [pct(20, 28)], mods: [{ type: 'stat', stat: 'resShadow', roll: 0, scale: P }], tags: ['RES_SHADOW'] },
  { id: 's15', side: 'suffix', name: 'Alle Resistenzen', text: '+{0}% auf alle Resistenzen', cats: ['J', 'R', 'O'], weight: 40, rolls: [pct(8, 12)], mods: [{ type: 'stat', stat: 'resAll', roll: 0, scale: P }], tags: ['RES_ALL'] },
  { id: 's16', side: 'suffix', name: 'Blockchance', text: '+{0} Prozentpunkte Blockchance', cats: ['O'], weight: 70, rolls: [pct(4, 7)], mods: [{ type: 'stat', stat: 'blockChance', roll: 0, scale: P }], tags: ['BLOCK_CHANCE'] },
  { id: 's17', side: 'suffix', name: 'Ausweichchance', text: '+{0} Prozentpunkte Ausweichchance', cats: ['A', 'J'], weight: 70, rolls: [pct(2, 4)], mods: [{ type: 'stat', stat: 'evasion', roll: 0, scale: P }], tags: ['EVASION'] },
  { id: 's18', side: 'suffix', name: 'Mana-Regeneration', text: '+{0}% erhöhte Mana-Regeneration', cats: ['C', 'J', 'A'], weight: 75, rolls: [pct(15, 24)], mods: [{ type: 'stat', stat: 'manaRegen', roll: 0, scale: P }], tags: ['MANA_REGEN'] },
  { id: 's19', side: 'suffix', name: 'Lebensraub', text: '{0}% des direkten Angriffsschadens als Leben geraubt', cats: ['M', 'J'], weight: 50, rolls: [pct(1, 2)], mods: [{ type: 'stat', stat: 'lifeLeech', roll: 0, scale: P }], tags: ['LIFE_LEECH'] },
  { id: 's20', side: 'suffix', name: 'Abklingzeitverkürzung', text: '+{0}% Abklingzeitverkürzung', cats: ['C', 'J', 'R'], weight: 35, rolls: [pct(4, 7)], mods: [{ type: 'stat', stat: 'cdr', roll: 0, scale: P }], tags: ['CDR'] },
  { id: 's21', side: 'suffix', name: 'Magic Find', text: '+{0}% Magic Find', cats: ['A', 'J', 'B'], weight: 55, rolls: [pct(12, 20)], mods: [{ type: 'stat', stat: 'magicFind', roll: 0, scale: 1 }], tags: ['MAGIC_FIND'] },
  { id: 's22', side: 'suffix', name: 'Goldfund', text: '+{0}% Goldfund', cats: ['A', 'J', 'B'], weight: 70, rolls: [pct(15, 25)], mods: [{ type: 'stat', stat: 'goldFind', roll: 0, scale: P }], tags: ['GOLD_FIND'] },
  { id: 's23', side: 'suffix', name: 'Statuseffekt-Dauer', text: '+{0}% erhöhte Statuseffekt-Dauer', cats: ['M', 'C', 'J', 'R'], weight: 65, rolls: [pct(12, 20)], mods: [{ type: 'stat', stat: 'statusDuration', roll: 0, scale: P }], tags: ['STATUS_DURATION'] },
  { id: 's24', side: 'suffix', name: 'DoT-Wirkung', text: '+{0}% erhöhter Schaden über Zeit', cats: ['M', 'C', 'J', 'R'], weight: 65, rolls: [pct(10, 18)], mods: [{ type: 'inc', tags: ['DOT'], roll: 0, scale: P }], tags: ['DOT_EFFECT'] },
  { id: 's25', side: 'suffix', name: 'Heilwirkung', text: '+{0}% erhöhte Heilwirkung', cats: ['O', 'R', 'J'], weight: 55, rolls: [pct(12, 20)], mods: [{ type: 'stat', stat: 'healPower', roll: 0, scale: P }], tags: ['HEAL_POWER'] },
  { id: 's26', side: 'suffix', name: 'Skilllevel', text: '+{0} auf Stufe der Skillgruppe', cats: ['C', 'J', 'R'], weight: 25, rolls: [int(1, 1)], mods: [], tags: ['SKILL_LEVEL'], minItemLevel: 60, noTiers: true },
];

export const AFFIXES: AffixFamily[] = defs.map((d) => ({
  id: d.id,
  // D-085: exclusivity is per family (spec: "pro groupId nur einen Mod, unabhängig von dessen Tier")
  groupId: d.id,
  side: d.side,
  name: d.name,
  text: d.text,
  categories: d.cats,
  weight: d.weight,
  rolls: d.rolls,
  mods: d.mods,
  tags: d.tags,
  essenceTags: d.essence ?? [],
  minItemLevel: d.minItemLevel ?? 1,
  noTiers: d.noTiers,
}));

export const AFFIX_BY_ID: Record<string, AffixFamily> = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));
