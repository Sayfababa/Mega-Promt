import type { AffixInstance, ItemInstance, Rarity } from '../../engine/types';

export function mkItem(uid: string, baseId: string, opts: { rarity?: Rarity; ilvl?: number; prefixes?: AffixInstance[]; suffixes?: AffixInstance[]; uniqueId?: string; uniqueRolls?: number[] } = {}): ItemInstance {
  return {
    uid, baseId, rarity: opts.rarity ?? 'normal', itemLevel: opts.ilvl ?? 1,
    prefixes: opts.prefixes ?? [], suffixes: opts.suffixes ?? [], uniqueId: opts.uniqueId, uniqueRolls: opts.uniqueRolls,
    sockets: 0, runes: [], corrupted: false, fractured: false, locked: false, favorite: false, source: 'fixture', history: [],
  };
}
