import type { ClassDef } from '../../engine/types';

/** spec 3.1 — start attributes and automatic per-level gains. Only the Wächter is playable in the vertical slice. */
export const CLASSES: ClassDef[] = [
  { id: 'guardian', name: 'Wächter', start: { str: 15, dex: 10, int: 7, vit: 15 }, perLevel: { str: 1, dex: 0, int: 0, vit: 1 }, skills: ['g_cleave', 'g_shieldwall', 'g_bloodharvest', 'g_armorbreak', 'g_battlefury', 'g_lastbulwark'], passiveTree: 'guardian', starterItems: ['shortsword_t1', 'chest_plate_t1'], playable: true, icon: 'classes/guardian' },
  { id: 'arcanist', name: 'Arkanist', start: { str: 6, dex: 10, int: 18, vit: 11 }, perLevel: { str: 0, dex: 0, int: 1, vit: 1 }, skills: [], passiveTree: 'arcanist', starterItems: ['wand_t1'], playable: false, icon: 'classes/arcanist' },
  { id: 'shadowrunner', name: 'Schattenläufer', start: { str: 9, dex: 17, int: 9, vit: 10 }, perLevel: { str: 0, dex: 1, int: 0, vit: 1 }, skills: [], passiveTree: 'shadowrunner', starterItems: ['dagger_t1'], playable: false, icon: 'classes/shadowrunner' },
  { id: 'necromancer', name: 'Nekromant', start: { str: 7, dex: 10, int: 17, vit: 11 }, perLevel: { str: 0, dex: 0, int: 1, vit: 1 }, skills: [], passiveTree: 'necromancer', starterItems: ['sceptre_t1'], playable: false, icon: 'classes/necromancer' },
  { id: 'runesmith', name: 'Runenschmied', start: { str: 13, dex: 9, int: 14, vit: 11 }, perLevel: { str: 1, dex: 0, int: 1, vit: 0 }, skills: [], passiveTree: 'runesmith', starterItems: ['runeblade_t1'], playable: false, icon: 'classes/runesmith' },
  { id: 'inquisitor', name: 'Inquisitor', start: { str: 12, dex: 10, int: 12, vit: 13 }, perLevel: { str: 1, dex: 0, int: 0, vit: 1 }, skills: [], passiveTree: 'inquisitor', starterItems: ['sceptre_t1'], playable: false, icon: 'classes/inquisitor' },
];
export const CLASS_BY_ID: Record<string, ClassDef> = Object.fromEntries(CLASSES.map((c) => [c.id, c]));
