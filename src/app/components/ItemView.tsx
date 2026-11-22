import { getBase } from '../../content/bases/bases';
import { AFFIX_BY_ID } from '../../content/affixes/affixes';
import { UNIQUE_BY_ID } from '../../content/uniques/uniques';
import { formatAffix, tierRange } from '../../engine/loot/affixRoll';
import { requiredLevel } from '../../engine/loot/generator';
import { itemArmour, weaponProfile } from '../../engine/stats/aggregate';
import type { AffixInstance, ItemInstance } from '../../engine/types';
import { RARITY_LABEL, SLOT_LABEL, fmt, pct } from '../labels';
import { formatStat, itemIcon, itemName, type Comparison } from '../itemView';
import { GameImage } from './GameImage';

function rangeText(a: AffixInstance): string {
  const f = AFFIX_BY_ID[a.familyId];
  if (!f) return '';
  return f.rolls.map((_, i) => {
    const r = tierRange(f, i, a.tier);
    return r.min === r.max ? `${fmt(r.min, f.rolls[i]!.unit === 'int' ? 0 : 1)}` : `${fmt(r.min, f.rolls[i]!.unit === 'int' ? 0 : 1)}–${fmt(r.max, f.rolls[i]!.unit === 'int' ? 0 : 1)}`;
  }).join(' / ');
}

function AffixLine({ a, side, highlight }: { a: AffixInstance; side: 'P' | 'S'; highlight?: boolean }) {
  const f = AFFIX_BY_ID[a.familyId];
  const local = f?.mods.some((m) => m.type === 'local');
  return (
    <div className="affix" style={highlight ? { background: 'rgba(201,161,74,0.12)' } : undefined}>
      <span className="side" title={side === 'P' ? 'Präfix' : 'Suffix'}>{side}</span>
      <span className="txt">
        {formatAffix(a)}
        {a.sealed && <span className="rar-tag" style={{ color: 'var(--gold)', marginLeft: 6 }}>versiegelt</span>}
      </span>
      <span className="meta">
        <span className="tier-pill" title="Tier (T1 = höchstes reguläres Tier)">{f?.noTiers ? '–' : `T${a.tier}`}</span>{' '}
        [{rangeText(a)}] · {local ? 'lokal' : 'global'} · {f?.name ?? a.familyId}
      </span>
    </div>
  );
}

export function ItemTooltip({ item, highlightAffix, testId }: { item: ItemInstance; highlightAffix?: number; testId?: string }) {
  const base = getBase(item.baseId);
  const unique = item.uniqueId ? UNIQUE_BY_ID[item.uniqueId] : undefined;
  const wp = base.weapon ? weaponProfile(item) : null;
  const armour = base.armour ? itemArmour(item, base) : 0;
  const req = requiredLevel(item);
  return (
    <div className={`tooltip frame-${item.rarity}`} data-testid={testId}>
      <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <GameImage icon={itemIcon(item)} alt={itemName(item)} category={unique ? 'unique' : 'item'} size={56} color={`var(--r-${item.rarity})`} />
        <div style={{ minWidth: 0 }}>
          <p className="tt-name" data-testid="tt-name">{itemName(item)}</p>
          <div className="tt-sub">
            <span className={`rar-tag rar-${item.rarity}`}>{RARITY_LABEL[item.rarity]}</span>{' '}
            {item.corrupted && <span className="rar-tag corrupt-tag">Korrumpiert</span>}{' '}
            {item.locked && <span className="rar-tag" style={{ color: 'var(--gold)' }}>Gesperrt</span>}
          </div>
          <div className="tt-sub">{unique ? `${base.name} · ` : ''}Itemlevel {item.itemLevel} · Benötigt Stufe {req}</div>
        </div>
      </div>
      <hr />
      {wp && (
        <dl className="kv">
          <dt>Physischer Schaden</dt><dd>{fmt(wp.min, 1)}–{fmt(wp.max, 1)}</dd>
          {(['fire', 'cold', 'lightning'] as const).map((el) => wp.elemental[el] && (
            <FragmentKV key={el} k={`${el === 'fire' ? 'Feuer' : el === 'cold' ? 'Frost' : 'Blitz'}schaden`} v={`${fmt(wp.elemental[el]!.min, 1)}–${fmt(wp.elemental[el]!.max, 1)}`} />
          ))}
          <dt>Angriffe pro Sekunde</dt><dd>{fmt(wp.aps, 2)}</dd>
          <dt>Kritische Trefferchance</dt><dd>{pct(wp.crit)}</dd>
          <dt>DPS (Waffe, physisch)</dt><dd data-testid="tt-dps">{fmt(((wp.min + wp.max) / 2) * wp.aps, 1)}</dd>
          <dt>Hände</dt><dd>{wp.hands === 2 ? 'Zweihändig (sperrt Nebenhand)' : 'Einhändig'}</dd>
        </dl>
      )}
      {armour > 0 && <dl className="kv"><dt>Rüstung</dt><dd>{Math.round(armour)}</dd></dl>}
      {base.implicitText && <><hr /><div className="implicit" title="Impliziter Modifikator der Basis">{base.implicitText}</div></>}
      {(item.prefixes.length > 0 || item.suffixes.length > 0) && <hr />}
      {item.prefixes.map((a, i) => <AffixLine key={`p${i}`} a={a} side="P" highlight={highlightAffix === i} />)}
      {item.suffixes.map((a, i) => <AffixLine key={`s${i}`} a={a} side="S" highlight={highlightAffix === item.prefixes.length + i} />)}
      {unique && (
        <>
          <hr />
          {unique.text.map((t, i) => (
            <div key={i} className="unique-line">{t.replace(/\{(\d)\}/g, (_, k: string) => String(item.uniqueRolls?.[Number(k)] ?? unique.uniqueRolls[Number(k)]?.min ?? '?'))}</div>
          ))}
          {unique.uniqueRolls.map((r, i) => (
            <div key={`r${i}`} className="tt-sub">Möglicher Bereich {r.label}: {r.min}–{r.max}</div>
          ))}
          <div className="tt-sub">Nachteil: {unique.tradeoff}</div>
          {unique.triggers.length > 0 && <div className="warn-line">Spezialeffekt: geschätzter Kampfeffekt nur durch Simulation.</div>}
        </>
      )}
      <hr />
      <div className="tt-sub">Sockel: {item.sockets > 0 ? `${item.runes.length}/${item.sockets}` : 'keine'} · Quelle: {item.source}</div>
    </div>
  );
}

function FragmentKV({ k, v }: { k: string; v: string }) {
  return <><dt>{k}</dt><dd>{v}</dd></>;
}

export function ComparisonView({ cmp, item }: { cmp: Comparison; item: ItemInstance }) {
  const unique = item.uniqueId ? UNIQUE_BY_ID[item.uniqueId] : undefined;
  const curUnique = cmp.current?.uniqueId ? UNIQUE_BY_ID[cmp.current.uniqueId] : undefined;
  return (
    <div data-testid="comparison">
      <h4>Vergleich mit {SLOT_LABEL[cmp.slot]}: {cmp.current ? itemName(cmp.current) : 'leer'}</h4>
      {cmp.removesOffhand && <p className="warn">Zweihandwaffe: Die Nebenhand würde abgelegt (im Vergleich berücksichtigt).</p>}
      {cmp.deltas.length === 0 ? (
        <p className="dim">Keine Änderung der Charakterwerte.</p>
      ) : (
        <table className="data">
          <tbody>
            {cmp.deltas.map((d) => (
              <tr key={d.key}>
                <td>{d.label}</td>
                <td className={`r ${d.delta > 0 === !d.key.startsWith('dmgTaken') ? 'pos' : 'neg'}`}>{formatStat(d, d.delta, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {((unique?.triggers.length ?? 0) > 0 || (curUnique?.triggers.length ?? 0) > 0) && (
        <p className="warn">Spezialeffekt beteiligt: geschätzter Kampfeffekt nur durch Simulation.</p>
      )}
    </div>
  );
}

export function ItemCell({ item, selected, onSelect, testId }: { item: ItemInstance; selected?: boolean; onSelect: () => void; testId?: string }) {
  const label = `${itemName(item)} (${RARITY_LABEL[item.rarity]})`;
  return (
    <button className={`cell filled frame-${item.rarity} ${selected ? 'selected' : ''}`} onClick={onSelect} aria-pressed={selected} aria-label={label} title={label} data-testid={testId} data-rarity={item.rarity}>
      <GameImage icon={itemIcon(item)} alt={itemName(item)} category={item.uniqueId ? 'unique' : 'item'} size={44} color={`var(--r-${item.rarity})`} decorative />
      <span className="cell-rar">{RARITY_LABEL[item.rarity].slice(0, 3).toUpperCase()}</span>
      {item.locked && <span className="cell-lock" aria-label="gesperrt">🔒</span>}
    </button>
  );
}
