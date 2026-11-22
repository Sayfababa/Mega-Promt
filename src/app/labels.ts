/** German display labels (UI only — no gameplay values). */
import type { EquipSlot, EssenceType, MaterialId, PriorityCondition, Rarity, EncounterType } from '../engine/types';

export const SLOT_LABEL: Record<EquipSlot, string> = {
  mainhand: 'Hauptwaffe', offhand: 'Nebenhand', helm: 'Helm', chest: 'Brust', gloves: 'Handschuhe', boots: 'Stiefel',
  belt: 'Gürtel', amulet: 'Amulett', ringA: 'Ring A', ringB: 'Ring B', relic: 'Relikt',
};

export const SLOT_ICON: Record<EquipSlot, string> = {
  mainhand: 'ui/slots/mainhand', offhand: 'ui/slots/offhand', helm: 'ui/slots/helm', chest: 'ui/slots/chest', gloves: 'ui/slots/gloves',
  boots: 'ui/slots/boots', belt: 'ui/slots/belt', amulet: 'ui/slots/amulet', ringA: 'ui/slots/ring', ringB: 'ui/slots/ring', relic: 'ui/slots/relic',
};

export const RARITY_LABEL: Record<Rarity, string> = { normal: 'Normal', magic: 'Magisch', rare: 'Selten', unique: 'Einzigartig' };
export const RARITY_ORDER: Rarity[] = ['normal', 'magic', 'rare', 'unique'];

export const MATERIAL_LABEL: Record<MaterialId, string> = {
  FORGE_DUST: 'Schmiedestaub', ARCANE_SHARD: 'Arkansplitter', ESSENCE: 'Essenz', CHAOS_FRAGMENT: 'Chaosfragment', SEAL_STONE: 'Siegelstein',
  VOID_ASH: 'Leerenasche', SOCKET_CORE: 'Sockelkern', CORRUPTION_CORE: 'Korruptionskern', RUNE_FRAGMENT: 'Runenfragment', BOSS_SIGIL: 'Bosssiegel',
};
export const materialIcon = (m: MaterialId): string => `materials/${m.toLowerCase()}`;

export const CONDITION_LABEL: Record<PriorityCondition, string> = {
  always: 'Immer',
  selfHpBelow35: 'Eigene LP unter 35%',
  selfHpBelow40: 'Eigene LP unter 40%',
  barrierBelow15: 'Barriere unter 15% max. LP',
  buffMissing: 'Effekt nicht aktiv',
  targetHpBelow25: 'Ziel-LP unter 25%',
  targetBleedStacks3: 'Ziel hat ≥3 Blutungs-Stapel',
};

export const ESSENCE_LABEL: Record<EssenceType, string> = {
  power: 'Essenz der Kraft', life: 'Essenz des Lebens', spark: 'Essenz des Funkens', ash: 'Essenz der Asche', poison: 'Essenz des Giftes', warding: 'Essenz der Abschirmung',
};
export const ESSENCE_TYPES: EssenceType[] = ['power', 'life', 'spark', 'ash', 'poison', 'warding'];

export const ENCOUNTER_LABEL: Record<EncounterType, string> = { normal: 'Normal', elite: 'Elite', boss: 'Boss', riftboss: 'Riftboss' };

export const ATTR_LABEL = { str: 'Stärke', dex: 'Geschick', int: 'Intelligenz', vit: 'Vitalität' } as const;

export const DTYPE_LABEL = { physical: 'Physisch', fire: 'Feuer', cold: 'Frost', lightning: 'Blitz', shadow: 'Schatten' } as const;

export const STATUS_LABEL: Record<string, string> = {
  bleed: 'Blutung', poison: 'Gift', burn: 'Brand', chill: 'Kälte', vulnerable: 'Verwundbar',
  shieldwall: 'Schildwall', armorbreak: 'Rüstungsbruch', battlefury: 'Kampfrausch',
};

export const pct = (v: number, digits = 1): string => `${(v * 100).toFixed(digits).replace('.', ',')}%`;
export const fmt = (v: number, digits = 0): string => v.toFixed(digits).replace('.', ',');
