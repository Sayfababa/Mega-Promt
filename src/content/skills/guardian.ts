import type { SkillDef } from '../../engine/types';

/** spec 11 — Wächter skills, exact numbers. Attack action time = 1000/APS; buffs use castTimeMs (min 400ms). */
export const BASIC_ATTACK: SkillDef = {
  id: 'basic_attack', classId: 'any', name: 'Standardangriff', kind: 'attack', tags: ['ATTACK', 'MELEE'],
  weaponCoefficient: 1.0, castTimeMs: 0, cooldownMs: 0, gcdMs: 0, manaCost: 0, defaultCondition: 'always', unlockLevel: 1,
  description: 'Angriff mit 100% Waffenschaden. Kostet kein Mana, keine Abklingzeit.', icon: 'skills/basic_attack',
};

export const GUARDIAN_SKILLS: SkillDef[] = [
  { id: 'g_cleave', unlockLevel: 1, classId: 'guardian', name: 'Spaltender Hieb', kind: 'attack', tags: ['ATTACK', 'MELEE', 'BLEED'],
    weaponCoefficient: 1.35, bleedChance: 0.35, castTimeMs: 0, cooldownMs: 2000, gcdMs: 0, manaCost: 12, defaultCondition: 'always',
    description: 'Angriff mit 135% Waffenschaden. 35% Chance, einen Blutungs-Stapel zu verursachen.', icon: 'skills/g_cleave' },
  { id: 'g_shieldwall', unlockLevel: 4, classId: 'guardian', name: 'Schildwall', kind: 'buff', tags: ['BARRIER', 'BUFF'],
    weaponCoefficient: 0, castTimeMs: 500, cooldownMs: 12000, gcdMs: 0, manaCost: 20, barrierPctMaxHp: 0.28,
    selfBuff: { statusId: 'shieldwall', durationMs: 4000, mods: [{ type: 'stat', stat: 'blockChance', value: 0.08 }] },
    defaultCondition: 'barrierBelow15',
    description: 'Erzeugt Barriere in Höhe von 28% max. LP (Obergrenze 60%) und +8 Prozentpunkte Blockchance für 4 s.', icon: 'skills/g_shieldwall' },
  { id: 'g_bloodharvest', unlockLevel: 6, classId: 'guardian', name: 'Bluternte', kind: 'attack', tags: ['ATTACK', 'MELEE', 'FINISHER'],
    weaponCoefficient: 1.65, coefficientPerTargetBleed: 0.28, consumesTargetBleeds: true, castTimeMs: 0, cooldownMs: 8000, gcdMs: 0, manaCost: 25,
    defaultCondition: 'targetBleedStacks3',
    description: 'Angriff mit 165% Waffenschaden +28% pro eigenem Blutungs-Stapel am Ziel. Verbraucht alle eigenen Blutungs-Stapel.', icon: 'skills/g_bloodharvest' },
  { id: 'g_armorbreak', unlockLevel: 2, classId: 'guardian', name: 'Rüstungsbruch', kind: 'attack', tags: ['ATTACK', 'MELEE', 'DEBUFF'],
    weaponCoefficient: 0.9, castTimeMs: 0, cooldownMs: 7000, gcdMs: 0, manaCost: 14,
    targetDebuff: { statusId: 'armorbreak', durationMs: 5000, armorReduction: 0.25 }, defaultCondition: 'buffMissing',
    description: 'Angriff mit 90% Waffenschaden. Senkt die Rüstung des Ziels 5 s lang um 25%.', icon: 'skills/g_armorbreak' },
  { id: 'g_battlefury', unlockLevel: 8, classId: 'guardian', name: 'Kampfrausch', kind: 'buff', tags: ['BUFF'],
    weaponCoefficient: 0, castTimeMs: 500, cooldownMs: 15000, gcdMs: 0, manaCost: 24,
    selfBuff: { statusId: 'battlefury', durationMs: 6000, mods: [{ type: 'stat', stat: 'attackSpeed', value: 0.18 }, { type: 'stat', stat: 'armorReduction', value: 0.12 }] },
    defaultCondition: 'buffMissing',
    description: '+18% Angriffsgeschwindigkeit für 6 s, währenddessen −12% Rüstung.', icon: 'skills/g_battlefury' },
  { id: 'g_lastbulwark', unlockLevel: 10, classId: 'guardian', name: 'Letztes Bollwerk', kind: 'buff', tags: ['HEAL'],
    weaponCoefficient: 0, castTimeMs: 500, cooldownMs: 20000, gcdMs: 0, manaCost: 35, healPctMaxHp: 0.18, requiresSelfHpBelow: 0.40,
    defaultCondition: 'selfHpBelow40',
    description: 'Heilt 18% der maximalen LP. Nur nutzbar unter 40% LP.', icon: 'skills/g_lastbulwark' },
];

export const SKILLS: SkillDef[] = [BASIC_ATTACK, ...GUARDIAN_SKILLS];
export const SKILL_BY_ID: Record<string, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
