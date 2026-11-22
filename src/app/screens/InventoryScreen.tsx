import { useMemo, useState } from 'react';
import { B } from '../../content/balance';
import type { MaterialId, Rarity } from '../../engine/types';
import { useGame } from '../store/gameStore';
import { ActionButton, ConfirmDialog } from '../components/common';
import { ComparisonView, ItemCell, ItemTooltip } from '../components/ItemView';
import { MATERIAL_LABEL, RARITY_LABEL, RARITY_ORDER, SLOT_LABEL } from '../labels';
import { compareItem, itemName, slotsForItem } from '../itemView';

type Tab = 'inventory' | 'stash' | 'pending';

export function InventoryScreen() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const check = useGame((s) => s.check);
  const setScreen = useGame((s) => s.setScreen);
  const setForgeItem = useGame((s) => s.setForgeItem);
  const [tab, setTab] = useState<Tab>(game.pendingRewards.length > 0 && game.inventory.length === 0 ? 'pending' : 'inventory');
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirmSalvage, setConfirmSalvage] = useState<string | null>(null);
  const [confirmAuto, setConfirmAuto] = useState(false);

  const list = tab === 'inventory' ? game.inventory : tab === 'stash' ? game.stash : game.pendingRewards;
  const cap = tab === 'inventory' ? B.inventorySize : tab === 'stash' ? B.stashTabSize : null;
  const minIdx = RARITY_ORDER.indexOf(game.lootFilter.minVisibleRarity);
  const visible = useMemo(() => list.filter((u) => {
    const it = game.items[u];
    if (!it) return false;
    if (RARITY_ORDER.indexOf(it.rarity) < minIdx) return false;
    if (search && !itemName(it).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [list, game.items, minIdx, search]);
  const hidden = list.length - visible.length;
  const item = selected ? game.items[selected] : undefined;
  const where: Tab | null = selected ? (game.inventory.includes(selected) ? 'inventory' : game.stash.includes(selected) ? 'stash' : game.pendingRewards.includes(selected) ? 'pending' : null) : null;

  const salvageYield = (r: Rarity): string =>
    (Object.entries(B.salvage[r]) as [MaterialId, [number, number]][]).map(([m, [a, b]]) => `${a === b ? a : `${a}–${b}`}× ${MATERIAL_LABEL[m]}`).join(', ');

  return (
    <div>
      <div className="screen-head">
        <h1>Inventar &amp; Truhe</h1>
        <span className="sub">Inventar {game.inventory.length}/{B.inventorySize} · Truhe {game.stash.length}/{B.stashTabSize} · Ausstehend {game.pendingRewards.length}</span>
      </div>

      {game.pendingRewards.length > 0 && (
        <section className="panel" data-testid="pending-panel" style={{ borderColor: 'var(--warn)' }}>
          <h3>Ausstehende Belohnungen ({game.pendingRewards.length})</h3>
          <p className="dim">Das Inventar war voll. Diese Gegenstände sind sicher gespeichert und gehen nicht verloren.</p>
          <div className="row">
            <ActionButton reason={check({ type: 'MOVE_PENDING_TO_INVENTORY' })} onClick={() => dispatch({ type: 'MOVE_PENDING_TO_INVENTORY' })} testId="pending-move">Soweit Platz: ins Inventar</ActionButton>
            <button onClick={() => setTab('pending')}>Ausstehende ansehen</button>
          </div>
        </section>
      )}

      <div className="cols" style={{ gridTemplateColumns: 'minmax(0, 1.2fr) minmax(300px, 1fr)', marginTop: '1rem' }}>
        <section className="panel">
          <div className="tabs" role="tablist">
            {(['inventory', 'stash', 'pending'] as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} aria-pressed={tab === t} onClick={() => setTab(t)} data-testid={`tab-${t}`}>
                {t === 'inventory' ? `Inventar (${game.inventory.length})` : t === 'stash' ? `Truhe (${game.stash.length})` : `Ausstehend (${game.pendingRewards.length})`}
              </button>
            ))}
          </div>
          <div className="row" style={{ marginBottom: '0.6rem' }}>
            <label htmlFor="inv-search" className="sr-only">Suche</label>
            <input id="inv-search" type="text" placeholder="Suchen …" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
            <label htmlFor="inv-filter">Mindestens</label>
            <select
              id="inv-filter"
              value={game.lootFilter.minVisibleRarity}
              onChange={(e) => dispatch({ type: 'SET_LOOT_FILTER', filter: { ...game.lootFilter, minVisibleRarity: e.target.value as Rarity } })}
              title="Lootfilter: reine Sichtbarkeit, ändert keine Dropchancen"
            >
              {RARITY_ORDER.map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
            </select>
          </div>
          {hidden > 0 && <p className="faint">{hidden} Gegenstände durch Filter/Suche ausgeblendet (Lootfilter ändert nur die Sichtbarkeit).</p>}
          <div className="item-grid" data-testid={`grid-${tab}`}>
            {visible.map((u) => (
              <ItemCell key={u} item={game.items[u]!} selected={selected === u} onSelect={() => setSelected(u)} testId={`item-${u}`} />
            ))}
            {cap !== null && Array.from({ length: Math.max(0, cap - list.length) }, (_, i) => <span key={`e${i}`} className="cell empty" aria-hidden="true" />)}
          </div>
          {visible.length === 0 && <p className="dim" style={{ marginTop: '0.6rem' }}>{tab === 'pending' ? 'Keine ausstehenden Belohnungen.' : 'Hier liegt nichts.'}</p>}
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '0.9rem 0' }} />
          <label className="row" style={{ gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={game.lootFilter.autoSalvageNormal}
              onChange={(e) => {
                if (e.target.checked) setConfirmAuto(true);
                else dispatch({ type: 'SET_LOOT_FILTER', filter: { ...game.lootFilter, autoSalvageNormal: false } });
              }}
            />
            Normale Gegenstände beim Abholen automatisch verwerten (nie Unique/gesperrt/Favorit)
          </label>
        </section>

        <section className="panel" data-testid="item-detail">
          {!item ? (
            <p className="dim">Wähle einen Gegenstand für Details, Vergleich und Aktionen.</p>
          ) : (
            <div className="stack">
              <ItemTooltip item={item} testId="detail-tooltip" />
              {(() => {
                const cmp = compareItem(game, item);
                return cmp && <ComparisonView cmp={cmp} item={item} />;
              })()}
              <div className="row" style={{ alignItems: 'flex-start' }}>
                {where === 'inventory' && slotsForItem(item).map((s) => (
                  <ActionButton key={s} className="primary" reason={check({ type: 'EQUIP_ITEM', uid: item.uid, slot: s })} onClick={() => dispatch({ type: 'EQUIP_ITEM', uid: item.uid, slot: s })} testId={`equip-${s}`}>
                    {slotsForItem(item).length > 1 ? `Ausrüsten: ${SLOT_LABEL[s]}` : 'Ausrüsten'}
                  </ActionButton>
                ))}
                {where === 'stash' && <ActionButton reason="Erst ins Inventar legen" onClick={() => undefined}>Ausrüsten</ActionButton>}
                {where === 'inventory' && <ActionButton reason={check({ type: 'STASH_ITEM', uid: item.uid, to: 'stash' })} onClick={() => dispatch({ type: 'STASH_ITEM', uid: item.uid, to: 'stash' })} testId="to-stash">In die Truhe</ActionButton>}
                {where === 'stash' && <ActionButton reason={check({ type: 'STASH_ITEM', uid: item.uid, to: 'inventory' })} onClick={() => dispatch({ type: 'STASH_ITEM', uid: item.uid, to: 'inventory' })} testId="to-inventory">Ins Inventar</ActionButton>}
                <button onClick={() => dispatch({ type: 'TOGGLE_LOCK', uid: item.uid })} aria-pressed={item.locked} data-testid="toggle-lock">{item.locked ? 'Entsperren' : 'Sperren'}</button>
                <ActionButton reason={where === 'pending' ? 'Erst ins Inventar legen' : null} onClick={() => { setForgeItem(item.uid); setScreen('forge'); }} testId="open-forge">In der Schmiede öffnen</ActionButton>
                <ActionButton className="danger" reason={check({ type: 'SALVAGE_ITEMS', uids: [item.uid] })} onClick={() => setConfirmSalvage(item.uid)} testId="salvage">Verwerten</ActionButton>
              </div>
            </div>
          )}
        </section>
      </div>

      {confirmSalvage && game.items[confirmSalvage] && (
        <ConfirmDialog
          title="Gegenstand verwerten?"
          confirmLabel="Endgültig verwerten"
          danger
          onCancel={() => setConfirmSalvage(null)}
          onConfirm={() => {
            const r = dispatch({ type: 'SALVAGE_ITEMS', uids: [confirmSalvage] });
            if (r.ok) setSelected(null);
            setConfirmSalvage(null);
          }}
        >
          <p><strong className={`rar-${game.items[confirmSalvage]!.rarity}`}>{itemName(game.items[confirmSalvage]!)}</strong> ({RARITY_LABEL[game.items[confirmSalvage]!.rarity]}) wird zerstört.</p>
          <p className="dim">Ertrag: {salvageYield(game.items[confirmSalvage]!.rarity)}. Diese Aktion ist nicht umkehrbar.</p>
        </ConfirmDialog>
      )}
      {confirmAuto && (
        <ConfirmDialog
          title="Automatisches Verwerten aktivieren?"
          confirmLabel="Regel aktivieren"
          onCancel={() => setConfirmAuto(false)}
          onConfirm={() => {
            dispatch({ type: 'SET_LOOT_FILTER', filter: { ...game.lootFilter, autoSalvageNormal: true } });
            setConfirmAuto(false);
          }}
        >
          <p>Beim Abholen von Belohnungen werden <strong>normale</strong> Gegenstände sofort verwertet ({salvageYield('normal')} je Stück).</p>
          <p className="dim">Einzigartige, gesperrte und favorisierte Gegenstände werden niemals automatisch verwertet.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
