import type { UniqueDef } from '../../engine/types';

/**
 * Unique catalogue for the vertical slice.
 * - 4 endgame uniques from spec section 12 with real hooks (sources not reachable in the slice;
 *   verified via fixtures / build lab).
 * - 2 low-level uniques required by spec (Kupferner Reißer, Ausgefranster Mantel).
 * - 2 additional low-level hook uniques (spec 12: "in früheren Spielstufen andere niedrige Uniques
 *   in eigener Tabelle verwenden") so that triggers are experienced in the slice. See D-046.
 * Unique roll values multiply the referenced modifier value (value * roll / 100 for %).
 */
export const UNIQUES: UniqueDef[] = [
  // ------------------------------------------------------------ endgame (spec 12)
  {
    id: 'u_bloodthirst', name: 'Blutdurst', baseId: 'greatsword_t5', minItemLevel: 60, dropSource: 'boss_bloodcolossus',
    uniqueRolls: [{ min: 25, max: 35, unit: 'int', label: 'erhöhter Blutungsschaden %' }],
    mods: [{ type: 'inc', tags: ['BLEED'], value: 0.01, rollIndex: 0 }, { type: 'stat', stat: 'bleedDuration', value: -0.25 }],
    triggers: [{ effectId: 'u_bloodthirst_crit_bleed', event: 'onCrit', chance: 1, icdMs: 0, effect: { kind: 'applyBleed' }, requireTags: ['ATTACK'] }],
    tags: ['BLEED', 'CRIT'], tradeoff: 'Blutungsdauer −25%',
    text: ['Kritische Treffer verursachen Blutung', '+{0}% erhöhter Blutungsschaden', '−25% Blutungsdauer'], internalCooldownMs: 0, icon: 'uniques/u_bloodthirst',
  },
  {
    id: 'u_unbrokenwall', name: 'Ungebrochene Mauer', baseId: 'shield_t5', minItemLevel: 60, dropSource: 'boss_gatewarden',
    uniqueRolls: [{ min: 11, max: 13, unit: 'int', label: 'Blockchance pp' }],
    mods: [{ type: 'stat', stat: 'blockChance', value: 0.01, rollIndex: 0 }, { type: 'stat', stat: 'attackSpeed', value: -0.10 }],
    triggers: [{ effectId: 'u_unbrokenwall_block_barrier', event: 'onBlock', chance: 1, icdMs: 2000, effect: { kind: 'gainBarrierPctMaxHp', value: 0.03 } }],
    tags: ['BLOCK', 'BARRIER'], tradeoff: '−10% Angriffsgeschwindigkeit',
    text: ['+{0} Prozentpunkte Blockchance', 'Bei Block: Barriere in Höhe von 3% max. LP (Abklingzeit 2 s)', '−10% Angriffsgeschwindigkeit'], internalCooldownMs: 2000, icon: 'uniques/u_unbrokenwall',
  },
  {
    id: 'u_scarletchain', name: 'Scharlachkette', baseId: 'amulet_str', minItemLevel: 60, dropSource: 'boss_bloodcolossus',
    uniqueRolls: [{ min: 18, max: 22, unit: 'int', label: 'mehr Finisher-Schaden %' }],
    mods: [{ type: 'stat', stat: 'bleedDurationFlatMs', value: -1000 }],
    triggers: [],
    special: { finisherMoreAtBleedStacks: { stacks: 3, more: 0.20 } },
    tags: ['BLEED', 'FINISHER'], tradeoff: 'Blutungs-Basisdauer −1 s',
    text: ['Finisher gegen Ziele mit 3+ Blutungs-Stapeln: +{0}% MEHR Schaden für diese Aktion', 'Blutungs-Basisdauer −1 s'], internalCooldownMs: 0, icon: 'uniques/u_scarletchain',
  },
  {
    id: 'u_thornpact', name: 'Dornenpakt', baseId: 'chest_plate_t5', minItemLevel: 60, dropSource: 'boss_gatewarden',
    uniqueRolls: [{ min: 8, max: 10, unit: 'int', label: 'Reflexion %' }],
    mods: [{ type: 'stat', stat: 'incMaxHP', value: -0.08 }],
    triggers: [{ effectId: 'u_thornpact_reflect', event: 'onHitTaken', chance: 1, icdMs: 0, effect: { kind: 'reflectPhysical', fraction: 0.09, capPctMaxHpPerSec: 0.05 } }],
    tags: ['REFLECT'], tradeoff: '−8% maximale LP',
    text: ['{0}% des erlittenen blockbaren Direktschadens als physischer Gegentreffer (max. 5% max. LP pro Sekunde)', '−8% maximale LP'], internalCooldownMs: 0, icon: 'uniques/u_thornpact',
  },
  // ------------------------------------------------------------ low level (spec 12 MVP)
  {
    id: 'u_copperripper', name: 'Kupferner Reißer', baseId: 'shortsword_t1', minItemLevel: 8, dropSource: 'world',
    uniqueRolls: [],
    mods: [{ type: 'inc', tags: ['PHYSICAL'], value: 0.10 }, { type: 'stat', stat: 'critChance', value: 0.01 }],
    triggers: [], tags: ['PHYSICAL'], tradeoff: 'keiner (Einsteiger-Unique)',
    text: ['+10% erhöhter physischer Schaden', '+1 Prozentpunkt kritische Trefferchance'], internalCooldownMs: 0, icon: 'uniques/u_copperripper',
  },
  {
    id: 'u_frayedmantle', name: 'Ausgefranster Mantel', baseId: 'chest_leather_t1', minItemLevel: 6, dropSource: 'world',
    uniqueRolls: [],
    mods: [{ type: 'stat', stat: 'flatHP', value: 25 }, { type: 'stat', stat: 'resCold', value: -0.05 }],
    triggers: [], tags: ['LIFE'], tradeoff: '−5% Frostresistenz',
    text: ['+25 maximale LP', '−5% Frostresistenz'], internalCooldownMs: 0, icon: 'uniques/u_frayedmantle',
  },
  // ------------------------------------------------------------ low level hook uniques (D-046)
  {
    id: 'u_rusttooth', name: 'Rostzahn', baseId: 'greataxe_t1', minItemLevel: 5, dropSource: 'world',
    uniqueRolls: [],
    mods: [{ type: 'stat', stat: 'critMulti', value: -0.15 }],
    triggers: [{ effectId: 'u_rusttooth_crit_bleed', event: 'onCrit', chance: 1, icdMs: 0, effect: { kind: 'applyBleed' }, requireTags: ['ATTACK'] }],
    tags: ['BLEED', 'CRIT'], tradeoff: '−15 Prozentpunkte Krit-Multiplikator',
    text: ['Kritische Treffer verursachen Blutung', '−15 Prozentpunkte Krit-Multiplikator'], internalCooldownMs: 0, icon: 'uniques/u_rusttooth',
  },
  {
    id: 'u_gravelordoath', name: 'Grabherrs Schwur', baseId: 'shield_t1', minItemLevel: 9, dropSource: 'boss_gravelord',
    uniqueRolls: [],
    mods: [{ type: 'stat', stat: 'blockChance', value: 0.05 }, { type: 'stat', stat: 'attackSpeed', value: -0.08 }],
    triggers: [{ effectId: 'u_gravelordoath_block_barrier', event: 'onBlock', chance: 1, icdMs: 3000, effect: { kind: 'gainBarrierPctMaxHp', value: 0.04 } }],
    tags: ['BLOCK', 'BARRIER'], tradeoff: '−8% Angriffsgeschwindigkeit',
    text: ['+5 Prozentpunkte Blockchance', 'Bei Block: Barriere in Höhe von 4% max. LP (Abklingzeit 3 s)', '−8% Angriffsgeschwindigkeit'], internalCooldownMs: 3000, icon: 'uniques/u_gravelordoath',
  },
];

export const UNIQUE_BY_ID: Record<string, UniqueDef> = Object.fromEntries(UNIQUES.map((u) => [u.id, u]));
