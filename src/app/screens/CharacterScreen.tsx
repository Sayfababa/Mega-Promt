import { useMemo, useState } from 'react';
import { CLASS_BY_ID } from '../../content/classes/classes';
import { derivedFor, equippedItems } from '../../engine/state/commands';
import { xpNext } from '../../engine/progression/levels';
import type { EquipSlot } from '../../engine/types';
import { useGame } from '../store/gameStore';
import { GameImage } from '../components/GameImage';
import { ActionButton, Bar, MaterialList } from '../components/common';
import { ComparisonView, ItemTooltip } from '../components/ItemView';
import { ATTR_LABEL, RARITY_LABEL, SLOT_ICON, SLOT_LABEL, fmt } from '../labels';
import { compareItem, formatStat, itemIcon, itemName, slotsForItem, statSummary } from '../itemView';

const LEFT: EquipSlot[] = ['helm', 'chest', 'gloves', 'belt', 'boots'];
const RIGHT: EquipSlot[] = ['mainhand', 'offhand', 'amulet', 'ringA', 'ringB', 'relic'];

export function CharacterScreen() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const check = useGame((s) => s.check);
  const [slot, setSlot] = useState<EquipSlot | null>('mainhand');
  const c = game.character!;
  const cls = CLASS_BY_ID[c.classId]!;
  const derived = useMemo(() => derivedFor(game), [game]);
  const eq = equippedItems(game);
  const stats = statSummary(derived);
  const need = xpNext(c.level);
  const sel = slot ? eq[slot] : undefined;
  const fitting = slot ? game.inventory.map((u) => game.items[u]!).filter((it) => slotsForItem(it).includes(slot)) : [];

  const renderSlot = (s: EquipSlot) => {
    const it = eq[s];
    return (
      <button key={s} className={`slot-btn ${it ? `frame-${it.rarity}` : ''}`} aria-pressed={slot === s} onClick={() => setSlot(s)} data-testid={`slot-${s}`} data-item={it ? it.uid : ''}>
        {it ? (
          <GameImage icon={itemIcon(it)} alt={itemName(it)} category={it.uniqueId ? 'unique' : 'item'} size={48} color={`var(--r-${it.rarity})`} decorative />
        ) : (
          <GameImage icon={SLOT_ICON[s]} alt={SLOT_LABEL[s]} category="slot" size={48} decorative />
        )}
        <span style={{ minWidth: 0 }}>
          <span className="slot-name">{SLOT_LABEL[s]}</span>
          <br />
          {it ? (
            <span className={`slot-item rar-${it.rarity}`} data-testid={`slot-${s}-name`}>
              {itemName(it)} <small>({RARITY_LABEL[it.rarity]})</small>
            </span>
          ) : (
            <span className="slot-item faint" data-testid={`slot-${s}-name`}>leer</span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div>
      <div className="screen-head">
        <h1 data-testid="char-name">{c.name}</h1>
        <span className="sub">{cls.name} · Stufe <strong data-testid="char-level">{c.level}</strong></span>
      </div>
      <div className="cols" style={{ gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 1fr)' }}>
        <div>
          <section className="panel">
            <div className="row" style={{ marginBottom: '0.5rem' }}>
              <span>Erfahrung</span>
              <span className="spacer" />
              <span className="num dim" data-testid="char-xp">{Math.floor(c.xp)} / {Number.isFinite(need) ? need : '—'} EP</span>
            </div>
            <Bar kind="xp" value={c.xp} max={Number.isFinite(need) ? need : 1} label="" />
          </section>
          <section className="panel">
            <h2>Ausrüstung</h2>
            <div className="doll">
              <div className="col">{LEFT.map((s) => renderSlot(s))}</div>
              <div className="figure">
                <GameImage icon={`${cls.icon}_full`} alt={cls.name} category="class" width={180} height={300} />
                <small className="dim">{cls.name}</small>
              </div>
              <div className="col">{RIGHT.map((s) => renderSlot(s))}</div>
            </div>
          </section>
          {slot && (
            <section className="panel" data-testid="slot-detail">
              <h3>{SLOT_LABEL[slot]}</h3>
              {sel ? (
                <div className="grid-2">
                  <ItemTooltip item={sel} />
                  <div className="stack">
                    <ActionButton reason={check({ type: 'UNEQUIP_ITEM', slot })} onClick={() => dispatch({ type: 'UNEQUIP_ITEM', slot })} testId="unequip">Ablegen</ActionButton>
                  </div>
                </div>
              ) : (
                <p className="dim">Kein Gegenstand ausgerüstet.</p>
              )}
              <h4 style={{ marginTop: '0.8rem' }}>Passend im Inventar ({fitting.length})</h4>
              {fitting.length === 0 && <p className="faint">Keine passenden Gegenstände im Inventar.</p>}
              {fitting.map((it) => {
                const cmp = compareItem(game, it, slot);
                return (
                  <details key={it.uid} className="panel" style={{ padding: '0.5rem 0.7rem' }}>
                    <summary className={`rar-${it.rarity}`} style={{ cursor: 'pointer' }}>
                      {itemName(it)} <small>({RARITY_LABEL[it.rarity]}, ilvl {it.itemLevel})</small>
                    </summary>
                    <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                      <ItemTooltip item={it} />
                      <div className="stack">
                        {cmp && <ComparisonView cmp={cmp} item={it} />}
                        <ActionButton className="primary" reason={check({ type: 'EQUIP_ITEM', uid: it.uid, slot })} onClick={() => dispatch({ type: 'EQUIP_ITEM', uid: it.uid, slot })}>
                          In {SLOT_LABEL[slot]} ausrüsten
                        </ActionButton>
                      </div>
                    </div>
                  </details>
                );
              })}
            </section>
          )}
        </div>
        <div>
          <section className="panel" data-testid="attributes">
            <h2>Attribute</h2>
            <p className="dim">Freie Punkte: <strong data-testid="attr-points" className="num">{c.unspentAttributePoints}</strong></p>
            {(Object.keys(ATTR_LABEL) as (keyof typeof ATTR_LABEL)[]).map((k) => {
              const reason = c.unspentAttributePoints < 1 ? 'Keine freien Attributpunkte' : null;
              return (
                <div className="attr-row" key={k}>
                  <span>{ATTR_LABEL[k]} <small className="faint">(verteilt {c.allocated[k]})</small></span>
                  <strong className="num">{derived[k]}</strong>
                  <button className="small" disabled={!!reason} title={reason ?? `+1 ${ATTR_LABEL[k]}`} onClick={() => dispatch({ type: 'ALLOCATE_ATTRIBUTE', attr: k, amount: 1 })} aria-label={`${ATTR_LABEL[k]} um 1 erhöhen`} data-testid={`attr-${k}`}>+1</button>
                </div>
              );
            })}
            {c.unspentAttributePoints < 1 && <span className="reason">Attributpunkte gibt es mit jedem Stufenaufstieg (+2).</span>}
          </section>
          <section className="panel" data-testid="stat-details">
            <h2>Werte</h2>
            <dl className="kv">
              {stats.map((l) => (
                <FragmentRow key={l.key} label={l.label} value={formatStat(l, l.value)} />
              ))}
            </dl>
            {derived.conditionalStats.length > 0 && (
              <p className="faint" style={{ marginTop: '0.5rem' }}>+{derived.conditionalStats.length} bedingte Modifikatoren (wirken nur unter ihrer Bedingung im Kampf).</p>
            )}
            {derived.uniqueIds.length > 0 && <p className="warn">Unique-Effekte aktiv – Kampfwirkung nur durch Simulation bestimmbar.</p>}
          </section>
          <section className="panel">
            <h2>Gold &amp; Materialien</h2>
            <p>Gold: <strong className="num">{fmt(game.gold)}</strong></p>
            <MaterialList materials={game.materials} />
          </section>
        </div>
      </div>
    </div>
  );
}

function FragmentRow({ label, value }: { label: string; value: string }) {
  return <><dt>{label}</dt><dd>{value}</dd></>;
}
