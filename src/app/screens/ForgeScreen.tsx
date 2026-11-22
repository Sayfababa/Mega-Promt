import { useState } from 'react';
import { AFFIX_BY_ID } from '../../content/affixes/affixes';
import { RECIPES, craftPreview, hasMaterials, validateCraft, type CraftParams, type RecipeDef, type RecipeId } from '../../engine/crafting/recipes';
import { formatAffix, tierRange } from '../../engine/loot/affixRoll';
import { EQUIP_SLOTS, type EssenceType, type MaterialId } from '../../engine/types';
import { useGame } from '../store/gameStore';
import { ConfirmDialog, MaterialList } from '../components/common';
import { ItemTooltip } from '../components/ItemView';
import { GameImage } from '../components/GameImage';
import { ESSENCE_LABEL, ESSENCE_TYPES, MATERIAL_LABEL, RARITY_LABEL, SLOT_LABEL, fmt, pct } from '../labels';
import { itemIcon, itemName } from '../itemView';

export function ForgeScreen() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const check = useGame((s) => s.check);
  const forgeItemUid = useGame((s) => s.forgeItemUid);
  const setForgeItem = useGame((s) => s.setForgeItem);
  const [recipeId, setRecipeId] = useState<RecipeId>('imprint');
  const [affixIndex, setAffixIndex] = useState<number | undefined>(undefined);
  const [essence, setEssence] = useState<EssenceType | undefined>(undefined);
  const [confirm, setConfirm] = useState<RecipeDef | null>(null);
  const c = game.character!;

  const candidates: { uid: string; where: string }[] = [
    ...EQUIP_SLOTS.filter((s) => c.equipment[s]).map((s) => ({ uid: c.equipment[s]!, where: `Ausgerüstet: ${SLOT_LABEL[s]}` })),
    ...game.inventory.map((u) => ({ uid: u, where: 'Inventar' })),
    ...game.stash.map((u) => ({ uid: u, where: 'Truhe' })),
  ];
  const selUid = forgeItemUid && candidates.some((x) => x.uid === forgeItemUid) ? forgeItemUid : candidates[0]?.uid ?? null;
  const item = selUid ? game.items[selUid] : undefined;
  const affixes = item ? [...item.prefixes, ...item.suffixes] : [];

  const paramsFor = (r: RecipeDef): CraftParams => ({ ...(r.needsAffix ? { affixIndex } : {}), ...(r.needsEssence ? { essence } : {}) });
  const reasonFor = (r: RecipeDef): string | null => {
    if (!item) return 'Kein Gegenstand gewählt.';
    const v = validateCraft(item, r.id, paramsFor(r));
    if (v) return v;
    if (!hasMaterials(game.materials, r.cost)) {
      const lack = (Object.entries(r.cost) as [MaterialId, number][]).filter(([m, n]) => game.materials[m] < n).map(([m, n]) => `${n - game.materials[m]}× ${MATERIAL_LABEL[m]}`);
      return `Nicht genug Materialien: es fehlen ${lack.join(', ')}.`;
    }
    return check({ type: 'CRAFT_ITEM', uid: item.uid, recipe: r.id, params: paramsFor(r) });
  };
  const run = (r: RecipeDef): void => {
    if (!item) return;
    dispatch({ type: 'CRAFT_ITEM', uid: item.uid, recipe: r.id, params: paramsFor(r) });
  };

  const recipe = RECIPES.find((r) => r.id === recipeId)!;
  const preview = item ? craftPreview(item, recipe.id, paramsFor(recipe)) : [];
  const log = game.craftLog.filter((l) => l.itemUid === selUid).slice(-5).reverse();

  return (
    <div>
      <div className="screen-head">
        <h1>Schmiede</h1>
        <span className="sub">Jede Aktion wird vorab geprüft; bei Ablehnung wird nichts verbraucht.</span>
      </div>
      <div className="forge">
        <div>
          <section className="panel">
            <h2>Gegenstand</h2>
            {candidates.length === 0 ? <p className="dim">Keine Gegenstände vorhanden.</p> : (
              <div className="item-pick" role="listbox" aria-label="Gegenstand wählen" data-testid="forge-items">
                {candidates.map(({ uid, where }) => {
                  const it = game.items[uid]!;
                  return (
                    <button key={uid} role="option" aria-selected={uid === selUid} aria-pressed={uid === selUid} onClick={() => { setForgeItem(uid); setAffixIndex(undefined); }} data-testid={`forge-item-${uid}`}>
                      <GameImage icon={itemIcon(it)} alt={itemName(it)} category={it.uniqueId ? 'unique' : 'item'} size={28} color={`var(--r-${it.rarity})`} decorative flat />
                      <span className={`rar-${it.rarity}`}>{itemName(it)}</span>
                      <small className="dim">{RARITY_LABEL[it.rarity]} · ilvl {it.itemLevel} · {where}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
          {item && (
            <section className="panel" data-testid="forge-selected">
              <ItemTooltip item={item} highlightAffix={recipe.needsAffix ? affixIndex : undefined} />
              {log.length > 0 && (
                <>
                  <h4 style={{ marginTop: '0.7rem' }}>Schmiedeprotokoll</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.84rem' }}>
                    {log.map((l, i) => <li key={i}>{RECIPES.find((r) => r.id === l.recipe)?.name}: {l.summary} <span className="faint mono">{l.prevHash}→{l.newHash}</span></li>)}
                  </ul>
                </>
              )}
            </section>
          )}
        </div>
        <div>
          <section className="panel">
            <h2>Materialsaldo</h2>
            <MaterialList materials={game.materials} />
          </section>
          <section className="panel">
            <h2>Rezepte</h2>
            {RECIPES.map((r) => {
              const reason = reasonFor(r);
              const sel = r.id === recipeId;
              return (
                <div key={r.id} className={`recipe ${sel ? 'sel' : ''}`} data-testid={`recipe-${r.id}`}>
                  <div className="recipe-head">
                    <button className="ghost" aria-pressed={sel} onClick={() => setRecipeId(r.id)} style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', padding: '0.1rem 0.3rem' }}>{r.name}</button>
                    {r.irreversible && <span className="rar-tag neg">irreversibel</span>}
                    <span className="spacer" />
                    {(Object.entries(r.cost) as [MaterialId, number][]).map(([m, n]) => (
                      <span key={m} className={`cost ${game.materials[m] < n ? 'lack' : ''}`} title={`${MATERIAL_LABEL[m]}: vorhanden ${game.materials[m]}, benötigt ${n}`}>
                        {n}× {MATERIAL_LABEL[m]} <small className="dim">({game.materials[m]})</small>
                      </span>
                    ))}
                  </div>
                  <p className="dim" style={{ margin: '0.3rem 0', fontSize: '0.88rem' }}>{r.description} <span className="faint">Risiko: {r.risk}</span></p>
                  {sel && (
                    <div className="stack">
                      {r.needsAffix && (
                        <div className="row">
                          <label htmlFor="forge-affix">Affix</label>
                          <select id="forge-affix" value={affixIndex ?? ''} onChange={(e) => setAffixIndex(e.target.value === '' ? undefined : Number(e.target.value))}>
                            <option value="">– wählen –</option>
                            {affixes.map((a, i) => <option key={i} value={i}>{i < (item?.prefixes.length ?? 0) ? 'P' : 'S'} · T{a.tier} · {formatAffix(a)}</option>)}
                          </select>
                        </div>
                      )}
                      {r.needsEssence && (
                        <div className="row">
                          <label htmlFor="forge-essence">Essenz-Typ</label>
                          <select id="forge-essence" value={essence ?? ''} onChange={(e) => setEssence(e.target.value === '' ? undefined : (e.target.value as EssenceType))}>
                            <option value="">– wählen –</option>
                            {ESSENCE_TYPES.map((t) => <option key={t} value={t}>{ESSENCE_LABEL[t]}</option>)}
                          </select>
                        </div>
                      )}
                      <RecipeOutcome recipe={r} preview={preview} affixIndex={affixIndex} />
                    </div>
                  )}
                  <div className="row" style={{ justifyContent: 'flex-end', marginTop: '0.3rem' }}>
                    {reason && <span className="reason" data-testid={`recipe-${r.id}-reason`}>{reason}</span>}
                    <button className="primary" disabled={!!reason} title={reason ?? undefined} onClick={() => (r.irreversible ? setConfirm(r) : run(r))} data-testid={`recipe-${r.id}-run`}>
                      Ausführen
                    </button>
                  </div>
                </div>
              );
            })}
            <p className="faint" style={{ marginTop: '0.7rem' }}>Sockel, Runen und Korruption folgen in Phase 3/4 und werden bis dahin nicht angeboten.</p>
          </section>
        </div>
      </div>
      {confirm && item && (
        <ConfirmDialog
          title={`${confirm.name} ausführen?`}
          confirmLabel="Ja, ausführen"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => { run(confirm); setConfirm(null); }}
        >
          <p><strong className={`rar-${item.rarity}`}>{itemName(item)}</strong>: {confirm.description}</p>
          <p className="warn">Diese Aktion ist irreversibel. Kosten: {(Object.entries(confirm.cost) as [MaterialId, number][]).map(([m, n]) => `${n}× ${MATERIAL_LABEL[m]}`).join(', ')}.</p>
        </ConfirmDialog>
      )}
    </div>
  );

  function RecipeOutcome({ recipe: r, preview: pv, affixIndex: ai }: { recipe: RecipeDef; preview: ReturnType<typeof craftPreview>; affixIndex?: number }) {
    if (!item) return null;
    if (pv.length > 0) {
      return (
        <div data-testid="craft-preview">
          <h4>Wahrscheinlichkeitsvorschau (exakt aus Affixgewichten)</h4>
          <table className="data">
            <thead><tr><th>Familie</th><th>Seite</th><th className="r">P</th><th>Tier-P</th></tr></thead>
            <tbody>
              {pv.map((row) => (
                <tr key={row.familyId}>
                  <td>{row.name} <small className="faint">{row.familyId}</small></td>
                  <td>{row.side === 'prefix' ? 'Präfix' : 'Suffix'}</td>
                  <td className="r">{pct(row.p, 1)}</td>
                  <td><small>{row.tiers.map((tw) => `T${tw.tier} ${pct(tw.p, 0)}`).join(' · ')}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (r.id === 'remove') {
      const unsealed = affixes.filter((a) => !a.sealed);
      if (unsealed.length === 0) return null;
      return <p className="dim">Jeder nicht versiegelte Mod wird mit {pct(1 / unsealed.length, 1)} entfernt ({unsealed.length} Kandidaten).</p>;
    }
    if (r.id === 'reforge') return <p className="dim">Alle nicht versiegelten Mods ({affixes.filter((a) => !a.sealed).length}) werden durch gleich viele neue, zufällige gültige Mods ersetzt.</p>;
    const a = ai !== undefined ? affixes[ai] : undefined;
    if (a && (r.id === 'refine' || r.id === 'tierUp' || r.id === 'perfect')) {
      const fam = AFFIX_BY_ID[a.familyId];
      if (!fam) return null;
      const target = r.id === 'refine' ? a.tier : a.tier - 1;
      const ranges = fam.rolls.map((roll, i) => {
        const tr = tierRange(fam, i, target);
        return `${fmt(tr.min, roll.unit === 'int' ? 0 : 1)}–${fmt(tr.max, roll.unit === 'int' ? 0 : 1)}`;
      });
      return <p className="dim">Ergebnis: {fam.name} T{target}, Werte gleichverteilt in [{ranges.join(' / ')}].</p>;
    }
    if (r.id === 'refine' && item.rarity === 'unique') return <p className="dim">Alle variablen Unique-Werte werden innerhalb ihres Bereichs neu gewürfelt.</p>;
    return null;
  }
}
