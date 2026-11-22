/**
 * Pure view-model over RECORDED combat events (from replayRunEncounter). Nothing here decides
 * gameplay: bars/statuses are reconstructed only from event fields (hp, barrier, mana, status).
 */
import { SKILL_BY_ID } from '../content/skills/guardian';
import { MONSTERS } from '../content/monsters/monsters';
import { UNIQUES } from '../content/uniques/uniques';
import type { CombatEvent } from '../engine/combat/simulate';
import { DTYPE_LABEL, STATUS_LABEL } from './labels';

export interface Frame {
  t: number;
  hp: Record<string, number>;
  barrier: Record<string, number>;
  mana: Record<string, number>;
  statuses: Record<string, Record<string, number>>;
}

export interface Playback {
  frames: Frame[]; // frames[i] = state AFTER events[i]
  maxHp: Record<string, number>;
  duration: number;
}

export function buildPlayback(events: CombatEvent[], playerMaxMana: number): Playback {
  const maxHp: Record<string, number> = {};
  const start = events.find((e) => e.type === 'COMBAT_START');
  for (const part of (start?.note ?? '').split(',')) {
    const [id, v] = part.split(':');
    if (id && v) maxHp[id] = Number(v);
  }
  let cur: Frame = {
    t: 0,
    hp: { ...maxHp },
    barrier: Object.fromEntries(Object.keys(maxHp).map((k) => [k, 0])),
    mana: { player: playerMaxMana },
    statuses: Object.fromEntries(Object.keys(maxHp).map((k) => [k, {}])),
  };
  const frames: Frame[] = [];
  for (const e of events) {
    const next: Frame = { t: e.t, hp: { ...cur.hp }, barrier: { ...cur.barrier }, mana: { ...cur.mana }, statuses: cur.statuses };
    if (e.tgt && e.hp !== undefined) next.hp[e.tgt] = e.hp;
    if (e.tgt && e.barrier !== undefined) next.barrier[e.tgt] = e.barrier;
    if (e.type === 'BARRIER' && e.tgt && e.v !== undefined) next.barrier[e.tgt] = e.v;
    if (e.type === 'ACTION_BEGIN' && e.src && e.mana !== undefined) next.mana[e.src] = e.mana;
    if (e.type === 'DEATH' && e.tgt) next.hp[e.tgt] = 0;
    if ((e.type === 'APPLY_STATUS' || e.type === 'STATUS_EXPIRE') && e.tgt && e.status) {
      const st = { ...cur.statuses, [e.tgt]: { ...(cur.statuses[e.tgt] ?? {}) } };
      const m = st[e.tgt]!;
      if (e.type === 'APPLY_STATUS') m[e.status] = (m[e.status] ?? 0) + 1;
      else {
        const consumed = e.note?.startsWith('consumed:') ? Number(e.note.slice(9)) : 1;
        m[e.status] = Math.max(0, (m[e.status] ?? 0) - consumed);
        if (m[e.status] === 0) delete m[e.status];
      }
      next.statuses = st;
    }
    frames.push(next);
    cur = next;
  }
  const duration = events.length ? events[events.length - 1]!.t : 0;
  return { frames, maxHp, duration };
}

/** index of the last event with t <= time (−1 if none) */
export function lastIndexAt(events: CombatEvent[], time: number): number {
  let lo = 0;
  let hi = events.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid]!.t <= time) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

const ABILITY_NAME: Record<string, string> = Object.fromEntries(MONSTERS.flatMap((m) => m.abilities.map((a) => [a.id, a.name])));
const TRIGGER_NAME: Record<string, string> = Object.fromEntries(UNIQUES.flatMap((u) => u.triggers.map((t) => [t.effectId, u.name])));

export function skillName(id: string | undefined): string {
  if (!id) return '—';
  if (id.startsWith('dot:')) return STATUS_LABEL[id.slice(4)] ?? id.slice(4);
  if (id === 'monster_attack' || id === 'basic_attack') return 'Standardangriff';
  return SKILL_BY_ID[id]?.name ?? ABILITY_NAME[id] ?? (id === 'leech' ? 'Lebensraub' : id);
}

export function statusName(id: string): string {
  return STATUS_LABEL[id] ?? TRIGGER_NAME[id] ?? SKILL_BY_ID[id]?.name ?? id;
}

/** German log line for an event, or null for purely technical events */
export function describe(e: CombatEvent, name: (id: string | undefined) => string): string | null {
  switch (e.type) {
    case 'ACTION_BEGIN': return `${name(e.src)} setzt ${skillName(e.skill)} ein${e.v ? ` (${(e.v / 1000).toFixed(2).replace('.', ',')} s)` : ''}.`;
    case 'DAMAGE': return `${name(e.src)} trifft ${name(e.tgt)} (${skillName(e.skill)}): ${e.v} ${e.dtype ? DTYPE_LABEL[e.dtype] : ''}${e.crit ? ' · KRITISCH' : ''}${e.blocked ? ' · geblockt' : ''}${e.absorbed ? ` · ${e.absorbed} von Barriere absorbiert` : ''}.`;
    case 'STATUS_TICK': return `${skillName(e.skill)} an ${name(e.tgt)}: ${e.v} Schaden${e.absorbed ? ` (${e.absorbed} absorbiert)` : ''}.`;
    case 'HEAL': return `${name(e.tgt)} heilt ${e.v} LP (${skillName(e.skill)}).`;
    case 'BLOCK': return `${name(e.tgt)} blockt (${e.v}% Blockstärke).`;
    case 'EVADE': return `${name(e.tgt)} weicht ${skillName(e.skill)} aus.`;
    case 'APPLY_STATUS': return `${name(e.tgt)}: ${statusName(e.status ?? '')}${e.v !== undefined ? ` (${String(e.v).replace('.', ',')}/s)` : ''}.`;
    case 'STATUS_EXPIRE': return e.note?.startsWith('consumed:') ? `${statusName(e.status ?? '')} an ${name(e.tgt)} verbraucht (${e.note.slice(9)} Stapel).` : null;
    case 'TRIGGER': return `Auslöser: ${statusName(e.note ?? '')} (${name(e.src)}).`;
    case 'TRIGGER_SUPPRESSED': return `Auslöser unterdrückt: ${statusName(e.note ?? '')}.`;
    case 'BARRIER': return e.note === 'expired' ? `Barriere von ${name(e.tgt)} verfällt.` : `${name(e.tgt)} hat ${e.v} Barriere (${skillName(e.skill)}).`;
    case 'DEATH': return `${name(e.tgt)} fällt.`;
    case 'PHASE_CHANGE': return `Phasenwechsel: ${e.note ?? ''}`;
    case 'VICTORY': return 'SIEG.';
    case 'DEFEAT': return 'NIEDERLAGE.';
    case 'TIMEOUT': return 'Zeitlimit erreicht – Begegnung verloren.';
    default: return null;
  }
}
