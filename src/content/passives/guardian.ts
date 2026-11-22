import type { PassiveNode } from '../../engine/types';

/**
 * Vertical-slice Wächter tree: 1 root, 8 small, 2 medium, 3 key nodes (spec 11.1).
 * Small: +2% relevant stat / +3% defence / +4% resistance / +1.5pp special. Medium: +6–10%.
 * Key nodes exactly as specified (Blutgericht, Eisenherz, Wüterich).
 */
export const GUARDIAN_TREE: PassiveNode[] = [
  { id: 'g_root', name: 'Eid des Wächters', size: 'root', mods: [], edges: ['g_s_hp', 'g_s_phys', 'g_s_armor'], text: 'Startpunkt (kostenlos).', pos: { x: 50, y: 88 } },
  { id: 'g_s_hp', name: 'Zähigkeit', size: 'small', mods: [{ type: 'stat', stat: 'incMaxHP', value: 0.03 }], edges: ['g_root', 'g_s_regen'], text: '+3% erhöhte maximale LP', pos: { x: 50, y: 70 } },
  { id: 'g_s_regen', name: 'Atemtechnik', size: 'small', mods: [{ type: 'stat', stat: 'manaRegen', value: 0.02 }], edges: ['g_s_hp'], text: '+2% erhöhte Mana-Regeneration', pos: { x: 50, y: 52 } },
  // blood branch
  { id: 'g_s_phys', name: 'Schwertarm', size: 'small', mods: [{ type: 'inc', tags: ['PHYSICAL'], value: 0.02 }], edges: ['g_root', 'g_s_bleed'], text: '+2% erhöhter physischer Schaden', pos: { x: 22, y: 74 } },
  { id: 'g_s_bleed', name: 'Gezahnte Klinge', size: 'small', mods: [{ type: 'stat', stat: 'bleedChance', value: 0.015 }], edges: ['g_s_phys', 'g_m_bleed'], text: '+1,5 Prozentpunkte Blutungschance bei Angriffstreffern', pos: { x: 15, y: 58 } },
  { id: 'g_m_bleed', name: 'Aderlass', size: 'medium', mods: [{ type: 'inc', tags: ['BLEED'], value: 0.08 }], edges: ['g_s_bleed', 'g_k_bloodcourt', 'g_s_speed'], text: '+8% erhöhter Blutungsschaden', pos: { x: 15, y: 40 } },
  { id: 'g_s_speed', name: 'Rasche Hiebe', size: 'small', mods: [{ type: 'stat', stat: 'attackSpeed', value: 0.02 }], edges: ['g_m_bleed', 'g_k_berserker'], text: '+2% erhöhte Angriffsgeschwindigkeit', pos: { x: 30, y: 28 } },
  { id: 'g_k_bloodcourt', name: 'Blutgericht', size: 'key', mods: [{ type: 'stat', stat: 'bleedChanceOnCrit', value: 0.20 }, { type: 'stat', stat: 'directDamageTakenInc', value: 0.10 }], edges: ['g_m_bleed'], text: '+20% Chance auf Blutung bei kritischem Treffer; +10% erhöhter erlittener Direktschaden', pos: { x: 8, y: 18 } },
  { id: 'g_k_berserker', name: 'Wüterich', size: 'key', mods: [{ type: 'inc', tags: ['ATTACK', 'PHYSICAL'], value: 0.18, cond: 'selfHpBelow50' }, { type: 'stat', stat: 'incMaxHP', value: -0.10 }], edges: ['g_s_speed'], text: '+18% erhöhter physischer Angriffsschaden bei LP unter 50%; −10% maximale LP', pos: { x: 32, y: 10 } },
  // shield branch
  { id: 'g_s_armor', name: 'Eisenhaut', size: 'small', mods: [{ type: 'stat', stat: 'incArmor', value: 0.03 }], edges: ['g_root', 'g_s_block'], text: '+3% erhöhte Rüstung', pos: { x: 78, y: 74 } },
  { id: 'g_s_block', name: 'Schildarm', size: 'small', mods: [{ type: 'stat', stat: 'blockChance', value: 0.015 }], edges: ['g_s_armor', 'g_m_shield'], text: '+1,5 Prozentpunkte Blockchance', pos: { x: 85, y: 58 } },
  { id: 'g_m_shield', name: 'Schildmeister', size: 'medium', mods: [{ type: 'stat', stat: 'blockPower', value: 0.08 }], edges: ['g_s_block', 'g_k_ironheart', 'g_s_res'], text: '+8% Blockstärke', pos: { x: 85, y: 40 } },
  { id: 'g_s_res', name: 'Standhaftigkeit', size: 'small', mods: [{ type: 'stat', stat: 'resAll', value: 0.04 }], edges: ['g_m_shield'], text: '+4% auf alle Resistenzen', pos: { x: 70, y: 28 } },
  { id: 'g_k_ironheart', name: 'Eisenherz', size: 'key', mods: [{ type: 'stat', stat: 'blockChance', value: 0.10 }, { type: 'stat', stat: 'attackSpeed', value: -0.12 }], edges: ['g_m_shield'], text: '+10 Prozentpunkte Blockchance; −12% Angriffsgeschwindigkeit', pos: { x: 92, y: 18 } },
];

export const PASSIVE_TREES: Record<string, PassiveNode[]> = { guardian: GUARDIAN_TREE };
