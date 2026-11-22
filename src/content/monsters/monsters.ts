import type { MonsterDef } from '../../engine/types';

/**
 * Original DARKFORGE monsters for the vertical slice. HP/DPS come from the level anchors
 * (spec 13.1a) × rank × archetype; abilities are INSIDE the DPS budget (hitMultiple).
 */
export const MONSTERS: MonsterDef[] = [
  // ---- Das Verlassene Tor (Lv 1–7)
  { id: 'gate_ravager', name: 'Torschänder', archetype: 'brute', rank: 'normal', damageType: 'physical', attackSpeed: 0.8, armorPerLevel: 6, resist: {}, critChance: 0.05, abilities: [], tags: ['humanoid'], icon: 'monsters/gate_ravager', description: 'Ein massiger Plünderer. Viel LP, langsame Schläge.' },
  { id: 'rust_crow', name: 'Rostkrähe', archetype: 'assassin', rank: 'normal', damageType: 'physical', attackSpeed: 1.4, armorPerLevel: 2, resist: {}, critChance: 0.12, evasion: 0.05, abilities: [], tags: ['beast'], icon: 'monsters/rust_crow', description: 'Schnelle Aaskrähe mit scharfem Schnabel. Wenig LP, häufige kritische Treffer.' },
  { id: 'ash_hound', name: 'Aschenhund', archetype: 'swarm', rank: 'normal', damageType: 'fire', attackSpeed: 1.1, armorPerLevel: 3, resist: { fire: 0.2 }, critChance: 0.05, abilities: [], tags: ['beast'], icon: 'monsters/ash_hound', description: 'Glimmender Hund, beißt mit Feuerschaden.' },
  { id: 'boss_rustwarden', name: 'Rostwächter', archetype: 'sentinel', rank: 'boss', damageType: 'physical', attackSpeed: 0.9, armorPerLevel: 10, resist: { fire: 0.1, cold: 0.1, lightning: 0.1, shadow: 0.1 }, critChance: 0.05, blockChance: 0.10,
    abilities: [{ id: 'rust_slam', name: 'Rostschlag', everyMs: 6000, hitMultiple: 2.5, damageType: 'physical', appliesBleed: true, description: 'Alle 6 s ein schwerer Schlag (2,5× Grundtreffer), verursacht Blutung.' }],
    tags: ['construct', 'boss'], icon: 'monsters/boss_rustwarden', description: 'Ein verrosteter Torkonstrukt. Blockt gelegentlich (10%). Alle 6 s Rostschlag mit Blutung.' },
  // ---- Verfallene Krypta (Lv 8–14)
  { id: 'crypt_shambler', name: 'Grabschlurfer', archetype: 'brute', rank: 'normal', damageType: 'physical', attackSpeed: 0.8, armorPerLevel: 7, resist: { shadow: 0.25 }, critChance: 0.05, abilities: [], tags: ['undead'], icon: 'monsters/crypt_shambler', description: 'Verwester Leichnam, zäh und langsam.' },
  { id: 'bone_archer', name: 'Knochenschütze', archetype: 'assassin', rank: 'normal', damageType: 'physical', attackSpeed: 1.3, armorPerLevel: 3, resist: { shadow: 0.25 }, critChance: 0.15, evasion: 0.08, abilities: [], tags: ['undead'], icon: 'monsters/bone_archer', description: 'Skelett mit Bogen. Hohe Krit-Chance, weicht aus.' },
  { id: 'crypt_hexer', name: 'Kryptahexer', archetype: 'caster', rank: 'normal', damageType: 'shadow', attackSpeed: 0.9, armorPerLevel: 2, resist: { shadow: 0.4, cold: 0.15 }, critChance: 0.05, abilities: [], tags: ['undead', 'caster'], icon: 'monsters/crypt_hexer', description: 'Untoter Zauberer, verursacht Schattenschaden.' },
  { id: 'ossuary_guard', name: 'Beinhauswächter', archetype: 'sentinel', rank: 'normal', damageType: 'physical', attackSpeed: 0.9, armorPerLevel: 14, resist: { shadow: 0.25 }, critChance: 0.05, blockChance: 0.15, abilities: [], tags: ['undead'], icon: 'monsters/ossuary_guard', description: 'Gepanzerter Skelettkrieger mit Turmschild. Hohe Rüstung, blockt 15%.' },
  { id: 'boss_gravelord', name: 'Grabherr', archetype: 'corruptor', rank: 'boss', damageType: 'shadow', attackSpeed: 1.0, armorPerLevel: 8, resist: { shadow: 0.45, physical: 0, cold: 0.2 }, critChance: 0.05,
    abilities: [{ id: 'grave_curse', name: 'Grabesfluch', everyMs: 8000, hitMultiple: 3.0, damageType: 'shadow', appliesPoison: true, description: 'Alle 8 s ein Schattenschlag (3× Grundtreffer), der vergiftet.' }],
    tags: ['undead', 'boss'], icon: 'monsters/boss_gravelord', description: 'Herr der Krypta. Schattenschaden, alle 8 s Grabesfluch (Gift). Schattenresistenz hilft.' },
  // ---- Rift-Probe (Lv 60)
  { id: 'abyss_spawn', name: 'Abgrundbrut', archetype: 'swarm', rank: 'normal', damageType: 'shadow', attackSpeed: 1.1, armorPerLevel: 6, resist: { shadow: 0.3 }, critChance: 0.05, abilities: [], tags: ['abyss'], icon: 'monsters/abyss_spawn', description: 'Formlose Brut aus dem Abgrund.' },
  { id: 'abyss_knight', name: 'Abgrundritter', archetype: 'sentinel', rank: 'elite', damageType: 'physical', attackSpeed: 0.9, armorPerLevel: 14, resist: { shadow: 0.3 }, critChance: 0.05, blockChance: 0.1, abilities: [], tags: ['abyss'], icon: 'monsters/abyss_knight', description: 'Gefallener Ritter, Elite.' },
  { id: 'rift_maw', name: 'Riftschlund', archetype: 'brute', rank: 'boss', damageType: 'physical', attackSpeed: 0.8, armorPerLevel: 10, resist: { fire: 0.2, cold: 0.2, lightning: 0.2, shadow: 0.2 }, critChance: 0.05,
    abilities: [{ id: 'maw_crush', name: 'Schlundbiss', everyMs: 7000, hitMultiple: 2.5, damageType: 'physical', appliesBleed: true, description: 'Alle 7 s ein Biss (2,5× Grundtreffer) mit Blutung.' }],
    tags: ['abyss', 'boss'], icon: 'monsters/rift_maw', description: 'Wechselnder Rift-Gegner (Probe).' },
];

export const MONSTER_BY_ID: Record<string, MonsterDef> = Object.fromEntries(MONSTERS.map((m) => [m.id, m]));
