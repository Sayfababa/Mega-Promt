import type { DungeonDef } from '../../engine/types';

/** Slice dungeons. Base groups: weapon/armour/jewellery/relic (spec 7: 45/35/15/5; relic has no slice bases → renormalised). */
export const SLICE_BASE_FAMILIES = [
  'shortsword', 'longsword', 'waraxe', 'mace', 'dagger', 'greatsword', 'greataxe', 'warhammer', 'spear',
  'shield', 'helm_plate', 'helm_leather', 'helm_cloth', 'chest_plate', 'chest_leather', 'chest_cloth',
  'ring_ruby', 'ring_sapphire', 'ring_topaz', 'ring_onyx', 'amulet_str', 'amulet_dex', 'amulet_int', 'amulet_vit',
];

export const DUNGEONS: (DungeonDef & { baseFamilies: string[]; background: string })[] = [
  {
    id: 'forsaken_gate', name: 'Das Verlassene Tor', minLevel: 1, maxLevel: 7,
    encounters: [
      { type: 'normal', monsterId: 'gate_ravager' },
      { type: 'normal', monsterId: 'rust_crow' },
      { type: 'normal', monsterId: 'ash_hound' },
      { type: 'boss', monsterId: 'boss_rustwarden' },
    ],
    baseWeights: { weapon: 45, armour: 35, jewellery: 15, relic: 5 },
    keepRewardsOnDefeat: true,
    description: 'Ein zerfallenes Festungstor am Rand der Ödnis. Frühe Waffen.',
    icon: 'dungeons/forsaken_gate', background: 'backgrounds/forsaken_gate', baseFamilies: SLICE_BASE_FAMILIES,
  },
  {
    id: 'decayed_crypt', name: 'Verfallene Krypta', minLevel: 8, maxLevel: 14,
    encounters: [
      { type: 'normal', monsterId: 'crypt_shambler' },
      { type: 'normal', monsterId: 'bone_archer' },
      { type: 'normal', monsterId: 'crypt_hexer' },
      { type: 'normal', monsterId: 'ossuary_guard' },
      { type: 'boss', monsterId: 'boss_gravelord' },
    ],
    baseWeights: { weapon: 45, armour: 35, jewellery: 15, relic: 5 },
    keepRewardsOnDefeat: true,
    description: 'Feuchte Grabgewölbe voller Untoter. Schattenaffixe; der Grabherr wirkt Schattenflüche.',
    icon: 'dungeons/decayed_crypt', background: 'backgrounds/decayed_crypt', baseFamilies: SLICE_BASE_FAMILIES,
  },
];

export const DUNGEON_BY_ID = Object.fromEntries(DUNGEONS.map((d) => [d.id, d]));
