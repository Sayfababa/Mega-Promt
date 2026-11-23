/**
 * Asset manifest — derived from the real content data (single source of truth for required images).
 * docs/ASSETS.md describes the motifs; `npm run assets:check` compares files in public/assets/ against
 * this manifest and the doc table. Files: public/assets/<path>.webp (or .png).
 */
import { CLASSES } from './classes/classes';
import { SKILLS } from './skills/guardian';
import { PASSIVE_TREES } from './passives/guardian';
import { UNIQUES } from './uniques/uniques';
import { MONSTERS } from './monsters/monsters';
import { DUNGEONS, SLICE_BASE_FAMILIES } from './dungeons/dungeons';
import { BASES } from './bases/bases';
import { MATERIAL_IDS } from '../engine/types';

export type AssetPriority = 'P1' | 'P2' | 'P3';
export interface AssetSpec {
  path: string;
  category: string;
  width: number;
  height: number;
  alpha: boolean;
  priority: AssetPriority;
  /** optional files are reported as info, never as missing errors */
  optional?: boolean;
}

const ICON = { width: 128, height: 128, alpha: true };

/** status effects that occur in the slice vs. defined-but-not-reachable */
export const STATUS_ICONS: Record<string, AssetPriority> = {
  bleed: 'P1', poison: 'P1', shieldwall: 'P1', battlefury: 'P1', armorbreak: 'P1',
  burn: 'P2', chill: 'P2', vulnerable: 'P2', curse: 'P2',
};

const SLICE_MATERIALS = new Set(['FORGE_DUST', 'ARCANE_SHARD', 'ESSENCE', 'CHAOS_FRAGMENT', 'SEAL_STONE', 'SOCKET_CORE', 'RUNE_FRAGMENT']);

export const passiveIcon = (id: string): string => `passives/${id}`;
export const statusIcon = (id: string): string => `status/${id}`;

export function buildAssetManifest(): AssetSpec[] {
  const out: AssetSpec[] = [];
  const add = (a: AssetSpec): void => {
    if (!out.some((x) => x.path === a.path)) out.push(a);
  };
  for (const c of CLASSES) {
    const p: AssetPriority = c.playable ? 'P1' : 'P2';
    add({ path: c.icon, category: 'Klasse', width: 512, height: 512, alpha: true, priority: p });
    add({ path: `${c.icon}_full`, category: 'Klasse (Ganzkörper)', width: 512, height: 1024, alpha: true, priority: p });
  }
  for (const s of SKILLS) add({ path: s.icon, category: 'Skill', ...ICON, priority: 'P1' });
  for (const tree of Object.values(PASSIVE_TREES)) for (const n of tree) add({ path: n.icon ?? passiveIcon(n.id), category: 'Talentknoten', ...ICON, priority: 'P1' });
  for (const [id, p] of Object.entries(STATUS_ICONS)) add({ path: statusIcon(id), category: 'Statuseffekt', ...ICON, priority: p });
  for (const m of MATERIAL_IDS) add({ path: `materials/${m.toLowerCase()}`, category: 'Material', ...ICON, priority: SLICE_MATERIALS.has(m) ? 'P1' : 'P2' });
  const sliceMonsters = new Set(DUNGEONS.flatMap((d) => d.encounters.map((e) => e.monsterId)));
  for (const m of MONSTERS) {
    const boss = m.rank === 'boss';
    add({ path: m.icon, category: boss ? 'Boss' : 'Monster', width: boss ? 768 : 512, height: boss ? 768 : 512, alpha: true, priority: sliceMonsters.has(m.id) ? 'P1' : 'P2' });
  }
  for (const d of DUNGEONS) {
    add({ path: d.icon, category: 'Dungeon-Thumbnail', width: 480, height: 270, alpha: false, priority: 'P1' });
    add({ path: d.background, category: 'Hintergrund', width: 1920, height: 1080, alpha: false, priority: 'P1' });
  }
  const sliceFamilies = new Set(SLICE_BASE_FAMILIES);
  for (const b of BASES) add({ path: b.icon, category: 'Item-Basis', ...ICON, priority: sliceFamilies.has(b.familyId) ? 'P1' : 'P2' });
  const dropSources = new Set(['world', ...DUNGEONS.flatMap((d) => d.encounters.map((e) => e.monsterId))]);
  for (const u of UNIQUES) add({ path: u.icon, category: 'Unique', ...ICON, priority: dropSources.has(u.dropSource) ? 'P1' : 'P2' });
  for (const r of ['normal', 'magic', 'rare', 'unique']) add({ path: `ui/frames/rarity_${r}`, category: 'UI-Rahmen', ...ICON, priority: 'P1' });
  add({ path: 'ui/frames/rarity_corrupt', category: 'UI-Rahmen', ...ICON, priority: 'P2' });
  for (const s of ['mainhand', 'offhand', 'helm', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring', 'relic']) add({ path: `ui/slots/${s}`, category: 'Slot-Silhouette', ...ICON, priority: 'P1' });
  add({ path: 'ui/panel_texture', category: 'UI-Textur', width: 512, height: 512, alpha: false, priority: 'P1' });
  for (const b of ['normal', 'hover', 'pressed', 'disabled']) add({ path: `ui/buttons/button_${b}`, category: 'UI-Button', width: 384, height: 96, alpha: true, priority: 'P1' });
  add({ path: 'ui/logo_darkforge', category: 'Logo', width: 1200, height: 300, alpha: true, priority: 'P1' });
  add({ path: 'ui/favicon', category: 'Favicon', width: 512, height: 512, alpha: true, priority: 'P1' });
  add({ path: 'ui/fx/hit_spark', category: 'Effekt', width: 1024, height: 256, alpha: true, priority: 'P2', optional: true });
  add({ path: 'ui/fx/crit_burst', category: 'Effekt', width: 1536, height: 256, alpha: true, priority: 'P2', optional: true });
  for (const [k, sz] of [['root', 128], ['small', 96], ['medium', 128], ['key', 160]] as const) {
    for (const st of ['active', 'inactive']) add({ path: `ui/talent/${k}_${st}`, category: 'Talent-Rahmen', width: sz, height: sz, alpha: true, priority: 'P1' });
  }
  add({ path: 'ui/currency_gold', category: 'Währung', ...ICON, priority: 'P1' });
  add({ path: 'ui/xp_bar_frame', category: 'UI-Leiste', width: 1024, height: 48, alpha: true, priority: 'P1' });
  add({ path: 'ui/xp_bar_fill', category: 'UI-Leiste', width: 256, height: 32, alpha: false, priority: 'P1' });
  return out;
}
