/**
 * Crafting recipes (spec 8.1). Every recipe: validate (no side effects) → cost → apply on a CLONE.
 * The command layer debits materials and writes the new item in ONE state transition (atomic).
 * Vertical slice: Prägen, Anreichern, Selten erheben, Ergänzen, Präzise Essenz, Neuschmieden,
 * Entfernen, Tier nachschmieden, T1-Vollendung, Werte verfeinern, Affix versiegeln.
 * Sockets/Runes/Korruption: Phase 3/4 (not offered in UI).
 */
import { AFFIX_BY_ID } from '../../content/affixes/affixes';
import { UNIQUE_BY_ID } from '../../content/uniques/uniques';
import { Rng } from '../core/rng';
import { hashOf } from '../core/hash';
import { affixRngs } from '../loot/generator';
import { addAffixOdds, addRandomAffix, allowedTiers, eligibleFamilies, openSlots, rollValues } from '../loot/affixRoll';
import type { AffixInstance, EssenceType, ItemInstance, MaterialId, Materials } from '../types';

export type RecipeId =
  | 'imprint' | 'enrich' | 'elevate' | 'augment' | 'preciseEssence' | 'reforge' | 'remove'
  | 'tierUp' | 'perfect' | 'refine' | 'seal';

export interface CraftParams {
  /** index into [...prefixes, ...suffixes] */
  affixIndex?: number;
  essence?: EssenceType;
}

export interface RecipeDef {
  id: RecipeId;
  name: string;
  cost: Partial<Record<MaterialId, number>>;
  description: string;
  risk: string;
  needsAffix?: boolean;
  needsEssence?: boolean;
  irreversible?: boolean;
}

export const RECIPES: RecipeDef[] = [
  { id: 'imprint', name: 'Prägen', cost: { FORGE_DUST: 4, ARCANE_SHARD: 1 }, description: 'Normal → Magisch mit 1 zufälligen gültigen Affix.', risk: 'keines' },
  { id: 'enrich', name: 'Anreichern', cost: { ARCANE_SHARD: 2 }, description: 'Magisch mit genau 1 Affix: fügt 1 Affix der fehlenden Seite hinzu.', risk: 'keines' },
  { id: 'elevate', name: 'Selten erheben', cost: { ARCANE_SHARD: 7, ESSENCE: 1 }, description: 'Magisch (1–2 Affixe) → Selten, +1 zusätzliches gültiges Affix.', risk: 'RNG neuer Mod' },
  { id: 'augment', name: 'Ergänzen', cost: { ESSENCE: 1, ARCANE_SHARD: 3 }, description: 'Selten mit freiem Slot: +1 gültiges Affix (Seite proportional zu offenen Slots).', risk: 'RNG' },
  { id: 'preciseEssence', name: 'Präzise Essenz', cost: { ESSENCE: 3, ARCANE_SHARD: 4 }, description: 'Selten mit freiem Slot: +1 Affix aus der Familie des gewählten Essenz-Typs.', risk: 'planbar', needsEssence: true },
  { id: 'reforge', name: 'Neuschmieden', cost: { CHAOS_FRAGMENT: 1, ARCANE_SHARD: 4 }, description: 'Selten (3–6 Mods): ersetzt alle nicht versiegelten Mods durch gleich viele neue. Verbraucht ein aktives Siegel.', risk: 'hoher RNG', irreversible: true },
  { id: 'remove', name: 'Entfernen', cost: { VOID_ASH: 1, ARCANE_SHARD: 4 }, description: 'Selten (≥2 entsperrte Mods): entfernt 1 gleichwahrscheinlich gewählten nicht versiegelten Mod.', risk: 'RNG', irreversible: true },
  { id: 'tierUp', name: 'Tier nachschmieden', cost: { ESSENCE: 2, SEAL_STONE: 1 }, description: 'Gewählter T3–T5-Mod steigt genau um 1 Tier (Itemlevel muss das Ziel-Tier erlauben).', risk: 'deterministisch', needsAffix: true },
  { id: 'perfect', name: 'T1-Vollendung', cost: { ESSENCE: 5, SEAL_STONE: 3, VOID_ASH: 2 }, description: 'Gewählter T2-Mod → T1 (ilvl ≥ 80), Werte innerhalb T1 neu gewürfelt.', risk: 'deterministisch, teuer', needsAffix: true },
  { id: 'refine', name: 'Werte verfeinern', cost: { FORGE_DUST: 5, ARCANE_SHARD: 1 }, description: 'Würfelt alle Zahlen des gewählten Affixes innerhalb seines Tiers neu.', risk: 'RNG, Tier unverändert', needsAffix: true },
  { id: 'seal', name: 'Affix versiegeln', cost: { SEAL_STONE: 3, ARCANE_SHARD: 8 }, description: 'Schützt genau 1 Mod für die nächste Neuschmieden-Operation.', risk: 'deterministisch', needsAffix: true },
];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r])) as Record<RecipeId, RecipeDef>;

export function allAffixesOf(item: ItemInstance): AffixInstance[] {
  return [...item.prefixes, ...item.suffixes];
}

function affixAt(item: ItemInstance, idx: number | undefined): AffixInstance | undefined {
  if (idx === undefined) return undefined;
  return allAffixesOf(item)[idx];
}

/** returns a German error message, or null if the craft is allowed. Never mutates. */
export function validateCraft(item: ItemInstance, recipe: RecipeId, params: CraftParams = {}): string | null {
  if (item.fractured) return 'Gebrochene Gegenstände können nicht mehr bearbeitet werden.';
  if (item.corrupted && recipe !== 'refine') return 'Korrumpierte Gegenstände erlauben keine regulären Affix-Crafts.';
  const n = item.prefixes.length + item.suffixes.length;
  const open = openSlots(item);
  switch (recipe) {
    case 'imprint':
      if (item.rarity !== 'normal') return 'Prägen erfordert einen normalen Gegenstand.';
      if (eligibleFamilies(item, 'prefix').length + eligibleFamilies(item, 'suffix').length === 0) return 'Kein gültiger Affix-Pool für diese Basis.';
      return null;
    case 'enrich': {
      if (item.rarity !== 'magic' || n !== 1) return 'Anreichern erfordert einen magischen Gegenstand mit genau 1 Affix.';
      const side = item.prefixes.length === 0 ? 'prefix' : 'suffix';
      if (eligibleFamilies(item, side).length === 0) return 'Kein gültiger Affix-Pool für die fehlende Seite.';
      return null;
    }
    case 'elevate': {
      if (item.rarity !== 'magic' || n < 1 || n > 2) return 'Selten erheben erfordert einen magischen Gegenstand mit 1–2 Affixen.';
      const probe = { ...item, rarity: 'rare' as const };
      if (addAffixOdds(probe).length === 0) return 'Kein gültiger Affix-Pool für ein zusätzliches Affix.';
      return null;
    }
    case 'augment':
      if (item.rarity !== 'rare') return 'Ergänzen erfordert einen seltenen Gegenstand.';
      if (open.prefix + open.suffix === 0) return 'Kein freier Affix-Slot.';
      if (addAffixOdds(item).length === 0) return 'Kein gültiger Affix-Pool für die offenen Slots.';
      return null;
    case 'preciseEssence':
      if (item.rarity !== 'rare') return 'Präzise Essenz erfordert einen seltenen Gegenstand.';
      if (!params.essence) return 'Bitte einen Essenz-Typ wählen.';
      if (open.prefix + open.suffix === 0) return 'Kein freier Affix-Slot.';
      if (addAffixOdds(item, { essence: params.essence }).length === 0) return 'Für diesen Essenz-Typ gibt es auf dieser Basis keine zulässige Affix-Familie (nichts wird verbraucht).';
      return null;
    case 'reforge':
      if (item.rarity !== 'rare' || n < 3) return 'Neuschmieden erfordert einen seltenen Gegenstand mit 3–6 Mods.';
      return null;
    case 'remove':
      if (item.rarity !== 'rare') return 'Entfernen erfordert einen seltenen Gegenstand.';
      if (allAffixesOf(item).filter((a) => !a.sealed).length < 2) return 'Mindestens 2 nicht versiegelte Mods erforderlich.';
      return null;
    case 'tierUp': {
      if (item.rarity !== 'rare') return 'Tier nachschmieden erfordert einen seltenen Gegenstand.';
      const a = affixAt(item, params.affixIndex);
      if (!a) return 'Bitte ein Affix wählen.';
      if (AFFIX_BY_ID[a.familyId]?.noTiers) return 'Dieses Affix besitzt keine Tiers.';
      if (a.tier < 3 || a.tier > 5) return 'Nur T3–T5-Mods können nachgeschmiedet werden (T2→T1: T1-Vollendung).';
      if (!allowedTiers(AFFIX_BY_ID[a.familyId]!, item.itemLevel).includes(a.tier - 1)) return `Itemlevel ${item.itemLevel} erlaubt T${a.tier - 1} nicht.`;
      return null;
    }
    case 'perfect': {
      if (item.rarity !== 'rare') return 'T1-Vollendung erfordert einen seltenen Gegenstand.';
      if (item.itemLevel < 80) return 'T1-Vollendung erfordert Itemlevel ≥ 80.';
      const a = affixAt(item, params.affixIndex);
      if (!a || a.tier !== 2) return 'Bitte einen T2-Mod wählen.';
      return null;
    }
    case 'refine': {
      if (item.rarity !== 'rare' && item.rarity !== 'unique') return 'Werte verfeinern erfordert einen seltenen oder einzigartigen Gegenstand.';
      if (item.rarity === 'unique') {
        if (!item.uniqueId || (UNIQUE_BY_ID[item.uniqueId]?.uniqueRolls.length ?? 0) === 0) return 'Dieses Unique hat keine variablen Werte.';
        return null;
      }
      if (!affixAt(item, params.affixIndex)) return 'Bitte ein Affix wählen.';
      return null;
    }
    case 'seal': {
      if (item.rarity !== 'rare') return 'Versiegeln erfordert einen seltenen Gegenstand.';
      const a = affixAt(item, params.affixIndex);
      if (!a) return 'Bitte ein Affix wählen.';
      if (allAffixesOf(item).some((x) => x.sealed)) return 'Es ist bereits ein Affix versiegelt (maximal eines).';
      return null;
    }
  }
}

export function hasMaterials(have: Materials, cost: Partial<Record<MaterialId, number>>): boolean {
  return (Object.entries(cost) as [MaterialId, number][]).every(([k, v]) => (have[k] ?? 0) >= v);
}

export interface CraftOutcome {
  item: ItemInstance;
  summary: string;
}

/** applies the recipe to a deep clone; caller guarantees validateCraft() === null */
export function applyCraft(original: ItemInstance, recipe: RecipeId, params: CraftParams, seed: number): CraftOutcome {
  const item: ItemInstance = structuredClone(original);
  const prevHash = hashOf(original);
  const rngs = affixRngs(seed, 'craft');
  let summary = '';
  const all = allAffixesOf(item);
  switch (recipe) {
    case 'imprint': {
      item.rarity = 'magic';
      const a = addRandomAffix(item, rngs)!;
      summary = `Neues Affix: ${a.familyId} T${a.tier}`;
      break;
    }
    case 'enrich': {
      const a = addRandomAffix(item, rngs, { side: item.prefixes.length === 0 ? 'prefix' : 'suffix' })!;
      summary = `Neues Affix: ${a.familyId} T${a.tier}`;
      break;
    }
    case 'elevate': {
      item.rarity = 'rare';
      const a = addRandomAffix(item, rngs)!;
      summary = `Jetzt selten. Neues Affix: ${a.familyId} T${a.tier}`;
      break;
    }
    case 'augment': {
      const a = addRandomAffix(item, rngs)!;
      summary = `Neues Affix: ${a.familyId} T${a.tier}`;
      break;
    }
    case 'preciseEssence': {
      const a = addRandomAffix(item, rngs, { essence: params.essence })!;
      summary = `Essenz (${params.essence}): ${a.familyId} T${a.tier}`;
      break;
    }
    case 'reforge': {
      const keepP = item.prefixes.filter((a) => a.sealed);
      const keepS = item.suffixes.filter((a) => a.sealed);
      const count = all.length - keepP.length - keepS.length;
      item.prefixes = keepP.map((a) => ({ ...a, sealed: undefined }));
      item.suffixes = keepS.map((a) => ({ ...a, sealed: undefined }));
      // groups of the sealed mod stay excluded because it remains on the item
      let added = 0;
      for (let k = 0; k < count; k++) if (addRandomAffix(item, rngs)) added++;
      summary = `${added} Mods neu geschmiedet${keepP.length + keepS.length ? ', 1 versiegelter Mod erhalten (Siegel verbraucht)' : ''}`;
      break;
    }
    case 'remove': {
      const candidates = all.filter((a) => !a.sealed);
      const victim = candidates[Rng.fromLabels(seed, 'remove').int(0, candidates.length - 1)]!;
      item.prefixes = item.prefixes.filter((a) => a !== victim);
      item.suffixes = item.suffixes.filter((a) => a !== victim);
      summary = `Entfernt: ${victim.familyId} T${victim.tier}`;
      break;
    }
    case 'tierUp':
    case 'perfect': {
      const a = all[params.affixIndex!]!;
      const fam = AFFIX_BY_ID[a.familyId]!;
      const old = a.tier;
      a.tier = old - 1;
      a.values = rollValues(fam, a.tier, rngs.value);
      summary = `${a.familyId}: T${old} → T${a.tier}`;
      break;
    }
    case 'refine': {
      if (item.rarity === 'unique') {
        const u = UNIQUE_BY_ID[item.uniqueId!]!;
        const r = Rng.fromLabels(seed, 'uniqueRefine');
        item.uniqueRolls = u.uniqueRolls.map((x) => (x.unit === 'int' ? r.int(x.min, x.max) : r.int(x.min * 10, x.max * 10) / 10));
        summary = `Unique-Werte neu: ${item.uniqueRolls.join(', ')}`;
      } else {
        const a = all[params.affixIndex!]!;
        a.values = rollValues(AFFIX_BY_ID[a.familyId]!, a.tier, rngs.value);
        summary = `${a.familyId} T${a.tier}: ${a.values.join('–')}`;
      }
      break;
    }
    case 'seal': {
      all[params.affixIndex!]!.sealed = true;
      summary = `${all[params.affixIndex!]!.familyId} versiegelt`;
      break;
    }
  }
  item.history.push({ action: `craft:${recipe}`, detail: summary, seed, prevHash, newHash: hashOf({ ...item, history: [] }) });
  if (item.history.length > 30) item.history = item.history.slice(-30);
  return { item, summary };
}

/** probabilistic preview computed from the real content data (spec 7.1 / 19 craftOdds) */
export function craftPreview(item: ItemInstance, recipe: RecipeId, params: CraftParams = {}): { familyId: string; name: string; side: string; p: number; tiers: { tier: number; p: number }[] }[] {
  if (validateCraft(item, recipe, params)) return [];
  switch (recipe) {
    case 'imprint': return addAffixOdds({ ...item, rarity: 'magic' });
    case 'enrich': return addAffixOdds(item, { side: item.prefixes.length === 0 ? 'prefix' : 'suffix' });
    case 'elevate': return addAffixOdds({ ...item, rarity: 'rare' });
    case 'augment': return addAffixOdds(item);
    case 'preciseEssence': return addAffixOdds(item, { essence: params.essence });
    default: return [];
  }
}
