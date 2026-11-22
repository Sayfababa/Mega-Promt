/**
 * DARKFORGE combat engine — deterministic discrete scheduler (100 ms ticks), spec section 10.
 *
 * Tick order (see docs/EVENT_ORDER.md):
 *   0. TICK event on second boundaries; regeneration (HP/mana, 1/10 of per-second values) for t>0
 *   1. DoT ticks (second boundaries + final partial tick at expiry)
 *   2. status / barrier expiry
 *   3. death check
 *   4. finishing actions resolve (initiative order: DEX desc, player first, entity id)
 *   5. monster timed abilities (instant, inside DPS budget)
 *   6. idle entities choose next action (APL)
 *   7. timeout check
 * Simultaneous death of both sides = DEFEAT (D-060).
 */
import { B } from '../../content/balance';
import { SKILL_BY_ID, BASIC_ATTACK } from '../../content/skills/guardian';
import { Rng } from '../core/rng';
import { roundHalfUp } from '../core/fixedPoint';
import { fnv1a, stableStringify } from '../core/hash';

import type { DerivedStats, StatMap } from '../stats/aggregate';
import {
  physicalReduction, effectiveResistance, capCrit, capCritMulti, capBlock, capBlockPower, capEvasion, capAps, capCdr, capLeech,
} from '../stats/mitigation';
import { monsterBasicHit } from './monsterScaling';
import type {
  Condition, DamageType, Modifier, MonsterDef, PriorityRule, ScalarStat, SkillDef, Tag, TriggerDef, TriggerEvent,
} from '../types';

// ------------------------------------------------------------------ types
export type CombatEventType =
  | 'COMBAT_START' | 'TICK' | 'ACTION_BEGIN' | 'ACTION_RESOLVE' | 'DAMAGE' | 'HEAL' | 'BLOCK' | 'EVADE' | 'CRIT'
  | 'APPLY_STATUS' | 'STATUS_TICK' | 'STATUS_EXPIRE' | 'TRIGGER' | 'TRIGGER_SUPPRESSED' | 'BARRIER' | 'DEATH'
  | 'PHASE_CHANGE' | 'VICTORY' | 'DEFEAT' | 'TIMEOUT';

export interface CombatEvent {
  t: number;
  type: CombatEventType;
  src?: string;
  tgt?: string;
  skill?: string;
  v?: number;
  crit?: boolean;
  blocked?: boolean;
  absorbed?: number;
  status?: string;
  dtype?: DamageType;
  hp?: number;     // target hp after event (for UI bars)
  barrier?: number;
  mana?: number;
  note?: string;
}

export interface StatusInstance {
  uid: number;
  id: string;           // 'bleed' | 'poison' | 'burn' | 'chill' | 'vulnerable' | skill status id
  kind: 'dot' | 'buff' | 'debuff';
  sourceId: string;
  sourceLevel: number;
  appliedAt: number;
  expireAt: number;
  // dot
  dtype?: DamageType;
  dps?: number;
  lastTickAt?: number;
  sourceSkill?: string;
  // buff/debuff
  mods?: Modifier[];
}

export interface CombatantSpec {
  id: string;
  name: string;
  side: 'player' | 'enemy';
  level: number;
  isBoss: boolean;
  derived: DerivedStats;
  /** player only */
  activeSkills?: string[];
  priority?: PriorityRule[];
  /** monster only */
  monster?: MonsterDef;
  monsterHit?: number;
}

interface Entity extends CombatantSpec {
  hp: number;
  mana: number;
  barrier: number;
  barrierLastGain: number;
  maxBarrier: number;
  statuses: StatusInstance[];
  cooldowns: Record<string, number>;
  action: { skill: SkillDef; start: number; end: number; oom: boolean } | null;
  nextActionAt: number;
  initiative: number;
  rngHit: Rng;
  rngTrig: Rng;
  icd: Record<string, number>;
  trigWindow: { sec: number; count: number };
  leechWindow: { sec: number; amount: number };
  reflectWindow: { sec: number; amount: number };
  alive: boolean;
}

export interface CombatResult {
  outcome: 'victory' | 'defeat' | 'timeout';
  durationMs: number;
  playerHpEnd: number;
  playerMaxHp: number;
  enemyHpEnd: number;
  events: CombatEvent[];
  eventHash: string;
  metrics: {
    damageBySource: Record<string, number>;
    directDamage: number;
    dotDamage: number;
    damageTaken: number;
    oomMs: number;
    actions: number;
    triggers: number;
    suppressed: number;
    crits: number;
    blocks: number;
    evades: number;
  };
}

export interface SimOptions {
  seed: number;
  maxMs?: number;
  record?: boolean;
}

// ------------------------------------------------------------------ helpers
const TYPE_TAGS: Record<DamageType, Tag[]> = {
  physical: ['PHYSICAL'],
  fire: ['FIRE', 'ELEMENTAL'],
  cold: ['COLD', 'ELEMENTAL'],
  lightning: ['LIGHTNING', 'ELEMENTAL'],
  shadow: ['SHADOW', 'ELEMENTAL'],
};
const RES_KEY: Record<Exclude<DamageType, 'physical'>, ScalarStat> = {
  fire: 'resFire', cold: 'resCold', lightning: 'resLightning', shadow: 'resShadow',
};
const PEN_KEY: Record<Exclude<DamageType, 'physical'>, ScalarStat> = {
  fire: 'penFire', cold: 'penCold', lightning: 'penLightning', shadow: 'penShadow',
};

function statusMods(e: Entity): Modifier[] {
  const out: Modifier[] = [];
  for (const s of e.statuses) if (s.mods) out.push(...s.mods);
  return out;
}

function stat(e: Entity, key: ScalarStat): number {
  let v = e.derived.stats[key] ?? 0;
  for (const s of e.statuses) if (s.mods) for (const m of s.mods) if (m.type === 'stat' && m.stat === key && !m.cond) v += m.value;
  return v;
}

function bleedStacksFrom(target: Entity, sourceId: string): number {
  let n = 0;
  for (const s of target.statuses) if (s.id === 'bleed' && s.sourceId === sourceId) n++;
  return n;
}

function hasStatus(e: Entity, id: string): boolean {
  return e.statuses.some((s) => s.id === id);
}

function checkCond(cond: Condition | undefined, self: Entity, target: Entity | null): boolean {
  if (!cond) return true;
  switch (cond) {
    case 'targetBleeding': return !!target && hasStatus(target, 'bleed');
    case 'targetPoisoned': return !!target && hasStatus(target, 'poison');
    case 'targetIsBoss': return !!target && target.isBoss;
    case 'targetHasBarrier': return !!target && target.barrier > 0;
    case 'targetHpBelow25': return !!target && target.hp < 0.25 * target.derived.maxHP;
    case 'selfHpAbove70': return self.hp > 0.7 * self.derived.maxHP;
    case 'selfHpBelow50': return self.hp < 0.5 * self.derived.maxHP;
    case 'withShield': return self.derived.hasShield;
  }
}

function condStat(e: Entity, key: ScalarStat, target: Entity | null): number {
  let v = stat(e, key);
  for (const m of e.derived.conditionalStats) if (m.stat === key && checkCond(m.cond, e, target)) v += m.value;
  return v;
}

function effectiveArmor(e: Entity): number {
  const inc = stat(e, 'incArmor');
  const red = Math.min(0.9, Math.max(0, stat(e, 'armorReduction')));
  return Math.max(0, e.derived.armorFlat * (1 + inc) * (1 - red));
}

function incFor(e: Entity, tags: Tag[], target: Entity | null): number {
  let sum = 0;
  for (const m of e.derived.incMods) {
    if (m.cond && !checkCond(m.cond, e, target)) continue;
    if (m.tags.every((t) => tags.includes(t))) sum += m.value;
  }
  for (const st of e.statuses) {
    if (!st.mods) continue;
    for (const m of st.mods) {
      if (m.type !== 'inc') continue;
      if (m.cond && !checkCond(m.cond, e, target)) continue;
      if (m.tags.every((t) => tags.includes(t))) sum += m.value;
    }
  }
  return sum;
}

function moreFor(e: Entity, tags: Tag[], target: Entity | null): number {
  if (e.derived.moreMods.length === 0 && !e.statuses.some((x) => x.mods?.some((m) => m.type === 'more'))) return 1;
  const groups = new Map<string, number>();
  const all = [...e.derived.moreMods, ...statusMods(e).filter((m) => m.type === 'more')] as (Modifier & { type: 'more' })[];
  for (const m of all) {
    if (!checkCond(m.cond, e, target)) continue;
    if (!m.tags.every((t) => tags.includes(t))) continue;
    // one entry per stacking group: strongest wins (stackingGroup limit)
    groups.set(m.group, Math.max(groups.get(m.group) ?? -Infinity, m.value));
  }
  let p = 1;
  for (const v of groups.values()) p *= 1 + v;
  return p;
}

function attackAps(e: Entity): number {
  const base = e.monster ? e.monster.attackSpeed : e.derived.weapon.aps;
  return capAps(base * (1 + stat(e, 'attackSpeed')));
}

function actionDuration(e: Entity, skill: SkillDef): number {
  let ms = skill.kind === 'attack' ? 1000 / attackAps(e) : skill.castTimeMs / (1 + stat(e, 'castSpeed'));
  if (hasStatus(e, 'chill')) ms = ms / (1 + B.chill.actionSpeed);
  // D-019: exact milliseconds; the action resolves in the first tick with t >= end, the next
  // action is scheduled from the exact due time → long-run APS is exact, jitter < 1 tick
  return Math.max(B.minActionMs, ms);
}

// ------------------------------------------------------------------ engine
export class CombatSim {
  t = 0;
  events: CombatEvent[] = [];
  private hashState = 0x811c9dc5;
  private statusUid = 0;
  private rootCounter = 0;
  readonly entities: Entity[];
  readonly player: Entity;
  readonly enemies: Entity[];
  private readonly record: boolean;
  private readonly maxMs: number;
  metrics: CombatResult['metrics'] = {
    damageBySource: {}, directDamage: 0, dotDamage: 0, damageTaken: 0, oomMs: 0, actions: 0, triggers: 0, suppressed: 0, crits: 0, blocks: 0, evades: 0,
  };

  constructor(player: CombatantSpec, enemies: CombatantSpec[], opts: SimOptions) {
    this.record = opts.record ?? true;
    const anyBoss = enemies.some((e) => e.isBoss);
    this.maxMs = opts.maxMs ?? (anyBoss ? B.maxBossCombatMs : B.maxCombatMs);
    const mk = (s: CombatantSpec): Entity => {
      const maxBarrier = B.caps.barrierMaxPctHp * s.derived.maxHP + (s.derived.stats.flatBarrier ?? 0);
      return {
        ...s,
        hp: s.derived.maxHP,
        mana: s.derived.maxMana,
        barrier: Math.min(maxBarrier, s.derived.stats.flatBarrier ?? 0),
        barrierLastGain: 0,
        maxBarrier,
        statuses: [],
        cooldowns: {},
        action: null,
        nextActionAt: 0,
        initiative: s.derived.dex,
        rngHit: Rng.fromLabels(opts.seed, 'hit', s.id),
        rngTrig: Rng.fromLabels(opts.seed, 'trig', s.id),
        icd: {},
        trigWindow: { sec: -1, count: 0 },
        leechWindow: { sec: -1, amount: 0 },
        reflectWindow: { sec: -1, amount: 0 },
        alive: true,
      };
    };
    this.player = mk(player);
    this.enemies = enemies.map(mk);
    this.entities = [this.player, ...this.enemies];
  }

  // ---------------------------------------------------------------- logging
  private emit(ev: CombatEvent): void {
    // rolling FNV-1a hash over every event in a FIXED field order (independent of recording →
    // fast-forward == replay). Numbers are hashed via their canonical string form.
    let h = this.hashState;
    const feed = (v: string | number | boolean | undefined): void => {
      const str = v === undefined ? '~' : String(v);
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      h ^= 0x7c;
      h = Math.imul(h, 0x01000193);
    };
    feed(ev.t); feed(ev.type); feed(ev.src); feed(ev.tgt); feed(ev.skill); feed(ev.v); feed(ev.crit); feed(ev.blocked);
    feed(ev.absorbed); feed(ev.status); feed(ev.dtype); feed(ev.hp); feed(ev.barrier); feed(ev.mana); feed(ev.note);
    this.hashState = h >>> 0;
    if (this.record) this.events.push(ev);
  }

  private orderCache: Entity[] | null = null;
  /** initiative order: DEX desc, player first, then stable entity id (initiative is static per fight) */
  private ordered(): Entity[] {
    if (!this.orderCache) {
      this.orderCache = [...this.entities].sort((a, b) => {
        if (b.initiative !== a.initiative) return b.initiative - a.initiative;
        if (a.side !== b.side) return a.side === 'player' ? -1 : 1;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    }
    return this.orderCache;
  }

  private opponentOf(e: Entity): Entity | null {
    if (e.side === 'player') return this.enemies.find((x) => x.alive) ?? null;
    return this.player.alive ? this.player : null;
  }

  // ---------------------------------------------------------------- run
  run(): CombatResult {
    this.emit({ t: 0, type: 'COMBAT_START', note: this.entities.map((e) => `${e.id}:${e.derived.maxHP}`).join(',') });
    let outcome: CombatResult['outcome'] | null = null;
    for (this.t = 0; ; this.t += B.tickMs) {
      const t = this.t;
      if (t % 1000 === 0 && t > 0) this.emit({ t, type: 'TICK', v: t / 1000 });
      if (t > 0) this.regen();
      this.dotTicks();
      this.expireStatuses();
      outcome = this.checkEnd();
      if (outcome) break;
      for (const e of this.ordered()) {
        if (!e.alive || !e.action || e.action.end > t) continue;
        this.resolveAction(e);
        outcome = this.checkEnd();
        if (outcome) break;
      }
      if (outcome) break;
      this.monsterAbilities();
      outcome = this.checkEnd();
      if (outcome) break;
      for (const e of this.ordered()) {
        if (!e.alive || e.action || e.nextActionAt > t) continue;
        this.beginAction(e);
      }
      if (t >= this.maxMs) {
        outcome = 'timeout';
        this.emit({ t, type: 'TIMEOUT' });
        break;
      }
    }
    if (outcome === 'victory') this.emit({ t: this.t, type: 'VICTORY' });
    else if (outcome === 'defeat') this.emit({ t: this.t, type: 'DEFEAT' });
    return {
      outcome,
      durationMs: this.t,
      playerHpEnd: Math.max(0, Math.floor(this.player.hp)),
      playerMaxHp: this.player.derived.maxHP,
      enemyHpEnd: this.enemies.reduce((s, e) => s + Math.max(0, Math.floor(e.hp)), 0),
      events: this.events,
      eventHash: (this.hashState >>> 0).toString(16).padStart(8, '0'),
      metrics: this.metrics,
    };
  }

  private checkEnd(): CombatResult['outcome'] | null {
    for (const e of this.entities) {
      if (e.alive && e.hp <= 0) {
        e.alive = false;
        e.hp = 0;
        e.action = null;
        this.emit({ t: this.t, type: 'DEATH', tgt: e.id });
      }
    }
    if (!this.player.alive) return 'defeat'; // D-060: simultaneous death counts as defeat
    if (this.enemies.every((e) => !e.alive)) return 'victory';
    return null;
  }

  private regen(): void {
    for (const e of this.entities) {
      if (!e.alive) continue;
      if (e.side === 'player') {
        e.hp = Math.min(e.derived.maxHP, e.hp + e.derived.hpRegen * (B.tickMs / 1000));
        e.mana = Math.min(e.derived.maxMana, e.mana + e.derived.manaRegen * (B.tickMs / 1000));
      }
    }
  }

  // ---------------------------------------------------------------- statuses
  private dotTicks(): void {
    const t = this.t;
    const boundary = t % 1000 === 0;
    for (const e of this.entities) {
      if (!e.alive) continue;
      for (const s of e.statuses) {
        if (s.kind !== 'dot' || s.dps === undefined || s.lastTickAt === undefined) continue;
        if (!(boundary || t >= s.expireAt) || t <= s.lastTickAt) continue;
        const until = Math.min(t, s.expireAt);
        const raw = s.dps * ((until - s.lastTickAt) / 1000);
        s.lastTickAt = until;
        if (raw <= 0) continue;
        const source = this.entities.find((x) => x.id === s.sourceId) ?? null;
        let amt = raw;
        if (s.dtype === 'physical') {
          amt *= 1 - physicalReduction(effectiveArmor(e), s.sourceLevel);
          amt *= 1 - (e.monster?.resist.physical ?? 0);
        } else if (s.dtype) {
          amt *= 1 - this.resistance(e, s.dtype, source);
        }
        amt *= 1 + stat(e, 'damageTakenInc') + this.vulnerableBonus(e);
        const dealt = roundHalfUp(amt);
        if (dealt <= 0) continue;
        this.applyDamage(e, dealt, source, `dot:${s.id}`, s.dtype ?? 'physical', true, false, false);
        if (source && source.side === 'player') {
          this.metrics.dotDamage += dealt;
          const key = s.sourceSkill ? `${s.id}(${s.sourceSkill})` : s.id;
          this.metrics.damageBySource[key] = (this.metrics.damageBySource[key] ?? 0) + dealt;
        }
      }
    }
  }

  private expireStatuses(): void {
    const t = this.t;
    for (const e of this.entities) {
      if (e.statuses.length) {
        const keep: StatusInstance[] = [];
        for (const s of e.statuses) {
          if (s.expireAt <= t) this.emit({ t, type: 'STATUS_EXPIRE', tgt: e.id, status: s.id });
          else keep.push(s);
        }
        e.statuses = keep;
      }
      if (e.barrier > 0 && t - e.barrierLastGain >= B.barrierDecayMs) {
        e.barrier = 0;
        this.emit({ t, type: 'BARRIER', tgt: e.id, v: 0, note: 'expired' });
      }
    }
  }

  private vulnerableBonus(e: Entity): number {
    let n = 0;
    for (const s of e.statuses) if (s.id === 'vulnerable') n++;
    return Math.min(n, B.vulnerable.maxStacks) * B.vulnerable.damageTaken;
  }

  private resistance(target: Entity, dtype: Exclude<DamageType, 'physical'>, source: Entity | null): number {
    let uncapped = stat(target, RES_KEY[dtype]) + stat(target, 'resAll');
    if (target.monster) uncapped += target.monster.resist[dtype] ?? 0;
    const pen = source ? stat(source, PEN_KEY[dtype]) : 0;
    return effectiveResistance(uncapped, pen);
  }

  private addStatus(target: Entity, s: Omit<StatusInstance, 'uid'>, maxStacks: number): void {
    const same = target.statuses.filter((x) => x.id === s.id && (s.kind !== 'dot' || x.sourceId === s.sourceId));
    if (same.length >= maxStacks) {
      // oldest stack is replaced ("ältester ablaufend")
      const oldest = same.reduce((a, b) => (a.appliedAt <= b.appliedAt && a.uid < b.uid ? a : b));
      target.statuses = target.statuses.filter((x) => x !== oldest);
      this.emit({ t: this.t, type: 'STATUS_EXPIRE', tgt: target.id, status: oldest.id, note: 'replaced' });
    }
    target.statuses.push({ ...s, uid: ++this.statusUid });
    this.emit({ t: this.t, type: 'APPLY_STATUS', src: s.sourceId, tgt: target.id, status: s.id, v: s.dps !== undefined ? Math.round(s.dps * 10) / 10 : undefined });
  }

  private applyDot(src: Entity, target: Entity, kind: 'bleed' | 'poison', rawHitBase: number, hitTags: Tag[], skillId: string): void {
    const cfg = kind === 'bleed' ? B.bleed : B.poison;
    const dtype: DamageType = kind === 'bleed' ? 'physical' : 'shadow';
    // D-026: snapshot = pct × raw (pre-increased, pre-crit) base of the triggering hit; offensive
    // modifiers are applied ONCE here with DoT tags → no double dipping.
    const tags: Tag[] = Array.from(new Set<Tag>([...hitTags.filter((x) => x === 'ATTACK' || x === 'SPELL'), 'DOT', kind === 'bleed' ? 'BLEED' : 'POISON', ...TYPE_TAGS[dtype]]));
    const total = cfg.pctOfHit * rawHitBase * (1 + incFor(src, tags, target)) * moreFor(src, tags, target) * (1 - stat(src, 'damageDealtReduction'));
    const durInc = stat(src, 'statusDuration') + stat(src, kind === 'bleed' ? 'bleedDuration' : 'poisonDuration');
    const flat = kind === 'bleed' ? stat(src, 'bleedDurationFlatMs') : 0;
    let duration = Math.max(B.tickMs, (cfg.durationMs + flat) * (1 + durInc));
    duration = Math.round(duration / B.tickMs) * B.tickMs;
    const dps = total / (cfg.durationMs / 1000);
    if (!(dps > 0)) return;
    this.addStatus(target, {
      id: kind, kind: 'dot', sourceId: src.id, sourceLevel: src.level, appliedAt: this.t, expireAt: this.t + duration,
      dtype, dps, lastTickAt: this.t, sourceSkill: skillId,
    }, cfg.maxStacks);
  }

  // ---------------------------------------------------------------- damage
  private applyDamage(target: Entity, amount: number, source: Entity | null, skill: string, dtype: DamageType, isDot: boolean, crit: boolean, blocked: boolean): { dealt: number; absorbed: number; barrierBroken: boolean } {
    let absorbed = 0;
    let rest = amount;
    let barrierBroken = false;
    if (target.barrier > 0) {
      absorbed = Math.min(target.barrier, rest);
      target.barrier -= absorbed;
      rest -= absorbed;
      if (target.barrier <= 0 && absorbed > 0) barrierBroken = true;
    }
    const before = target.hp;
    target.hp = target.hp - rest;
    const dealt = absorbed + Math.min(rest, Math.max(0, before));
    if (target.side === 'player') this.metrics.damageTaken += amount;
    this.emit({
      t: this.t, type: isDot ? 'STATUS_TICK' : 'DAMAGE', src: source?.id, tgt: target.id, skill, v: amount, dtype,
      crit: crit || undefined, blocked: blocked || undefined, absorbed: absorbed || undefined,
      hp: Math.max(0, Math.floor(target.hp)), barrier: Math.floor(target.barrier),
    });
    return { dealt, absorbed, barrierBroken };
  }

  /**
   * Direct hit pipeline (spec 3.2 order): base → increased → more → crit → evade → armour/resist →
   * damage taken → block → round (min 1) → barrier → HP → leech → triggers.
   */
  private directHit(
    src: Entity, target: Entity, skillId: string,
    portions: Partial<Record<DamageType, number>>, tags: Tag[],
    opts: { canCrit: boolean; evadable: boolean; blockable: boolean; weaponHit: boolean; extraMore?: number; noScaling?: boolean; bleedChance?: number; poisonChance?: number; root: TriggerCtx },
  ): { landed: boolean; crit: boolean; dealt: number; physBase: number } {
    // fixed RNG draw order per hit: crit, evade, block, status → stable paired comparisons
    const rCrit = src.rngHit.next();
    const rEvade = src.rngHit.next();
    const rBlock = src.rngHit.next();
    const rStatus = src.rngHit.next();
    const rStatus2 = src.rngHit.next();

    let total = 0;
    const scaled: Partial<Record<DamageType, number>> = {};
    for (const [dt, base] of Object.entries(portions) as [DamageType, number][]) {
      if (!(base > 0)) continue;
      const htags = [...tags, ...TYPE_TAGS[dt]];
      let amt = base;
      if (!opts.noScaling) {
        amt *= 1 + incFor(src, htags, target);
        amt *= moreFor(src, htags, target);
        amt *= opts.extraMore ?? 1;
        amt *= 1 - Math.min(0.9, stat(src, 'damageDealtReduction'));
      }
      scaled[dt] = amt;
    }
    // crit
    let crit = false;
    if (opts.canCrit) {
      const isSpell = tags.includes('SPELL');
      const baseCrit = src.monster ? src.monster.critChance : isSpell ? B.caps.critMin : src.derived.weapon.crit;
      const chance = capCrit(baseCrit + condStat(src, 'critChance', target));
      if (rCrit < chance) {
        crit = true;
        const mult = capCritMulti(condStat(src, 'critMulti', target));
        for (const k of Object.keys(scaled) as DamageType[]) scaled[k] = scaled[k]! * mult;
        this.metrics.crits += src.side === 'player' ? 1 : 0;
      }
    }
    // evade
    if (opts.evadable && rEvade < capEvasion(stat(target, 'evasion') + (target.monster?.evasion ?? 0))) {
      this.emit({ t: this.t, type: 'EVADE', src: src.id, tgt: target.id, skill: skillId });
      if (target.side === 'player') this.metrics.evades++;
      return { landed: false, crit: false, dealt: 0, physBase: 0 };
    }
    // mitigation per type
    let preMitigation = 0;
    for (const [dt, amt0] of Object.entries(scaled) as [DamageType, number][]) {
      preMitigation += amt0;
      let amt = amt0;
      if (dt === 'physical') {
        const pen = opts.weaponHit ? Math.min(1, stat(src, 'armorPen')) : 0;
        amt *= 1 - physicalReduction(effectiveArmor(target) * (1 - pen), src.level);
        amt *= 1 - (target.monster?.resist.physical ?? 0);
      } else {
        amt *= 1 - this.resistance(target, dt, src);
      }
      total += amt;
    }
    total *= 1 + stat(target, 'damageTakenInc') + stat(target, 'directDamageTakenInc') + this.vulnerableBonus(target);
    // block
    let blocked = false;
    if (opts.blockable) {
      const chance = capBlock(stat(target, 'blockChance') + (target.monster?.blockChance ?? 0));
      if (rBlock < chance) {
        blocked = true;
        const power = capBlockPower(B.baseBlockPower + condStat(target, 'blockPower', src));
        total *= 1 - power;
        this.emit({ t: this.t, type: 'BLOCK', src: src.id, tgt: target.id, skill: skillId, v: Math.round(power * 100) });
        if (target.side === 'player') this.metrics.blocks++;
      }
    }
    const final = Math.max(1, roundHalfUp(total));
    if (crit) this.emit({ t: this.t, type: 'CRIT', src: src.id, tgt: target.id, skill: skillId });
    const mainType = (Object.keys(scaled)[0] as DamageType | undefined) ?? 'physical';
    const res = this.applyDamage(target, final, src, skillId, mainType, false, crit, blocked);
    if (src.side === 'player') {
      this.metrics.directDamage += res.dealt;
      this.metrics.damageBySource[skillId] = (this.metrics.damageBySource[skillId] ?? 0) + res.dealt;
    }
    // leech (attacks only, actual direct damage dealt)
    if (tags.includes('ATTACK') && !tags.includes('TRIGGERED')) {
      const leech = capLeech(stat(src, 'lifeLeech'));
      if (leech > 0 && src.alive) {
        const sec = Math.floor(this.t / 1000);
        if (src.leechWindow.sec !== sec) src.leechWindow = { sec, amount: 0 };
        const budget = B.caps.leechPerSecPctMaxHp * src.derived.maxHP - src.leechWindow.amount;
        const heal = Math.max(0, Math.min(res.dealt * leech, budget));
        if (heal > 0) {
          src.leechWindow.amount += heal;
          this.heal(src, heal, 'leech', false);
        }
      }
    }
    // physical base of the hit (pre-increase, pre-crit) for DoT snapshots
    const physBase = portions.physical ?? 0;
    // status application
    if (!tags.includes('TRIGGERED')) {
      const bleedChance = (opts.bleedChance ?? 0) + (tags.includes('ATTACK') ? stat(src, 'bleedChance') + (crit ? stat(src, 'bleedChanceOnCrit') : 0) : 0);
      if (bleedChance > 0 && physBase > 0 && rStatus < bleedChance && target.alive) this.applyDot(src, target, 'bleed', physBase, tags, skillId);
      const poisonChance = (opts.poisonChance ?? 0) + (tags.includes('ATTACK') ? stat(src, 'poisonChance') : 0);
      const totalBase = Object.values(portions).reduce((a, b) => a + (b ?? 0), 0);
      if (poisonChance > 0 && rStatus2 < poisonChance && target.alive) this.applyDot(src, target, 'poison', totalBase, tags, skillId);
    }
    // triggers
    const info: TriggerInfo = { tags, physBase, target, attacker: src, preMitigation, skillId };
    if (crit) this.fireTriggers(src, 'onCrit', info, opts.root);
    if (tags.includes('ATTACK')) this.fireTriggers(src, 'onAttackHit', info, opts.root);
    if (blocked) this.fireTriggers(target, 'onBlock', { ...info, target: src, attacker: src }, opts.root);
    if (opts.blockable && !tags.includes('TRIGGERED')) this.fireTriggers(target, 'onHitTaken', { ...info, target: src }, opts.root);
    return { landed: true, crit, dealt: res.dealt, physBase };
  }

  private heal(e: Entity, amount: number, skill: string, scale = true): void {
    const amt = scale ? amount * (1 + stat(e, 'healPower')) : amount;
    const before = e.hp;
    e.hp = Math.min(e.derived.maxHP, e.hp + amt);
    const healed = e.hp - before;
    if (healed > 0) this.emit({ t: this.t, type: 'HEAL', tgt: e.id, skill, v: Math.round(healed), hp: Math.floor(e.hp) });
  }

  private gainBarrier(e: Entity, amount: number, skill: string): void {
    const amt = amount * (1 + stat(e, 'barrierPower'));
    e.barrier = Math.min(e.maxBarrier, e.barrier + amt);
    e.barrierLastGain = this.t;
    this.emit({ t: this.t, type: 'BARRIER', tgt: e.id, skill, v: Math.floor(e.barrier) });
  }

  // ---------------------------------------------------------------- triggers
  private fireTriggers(owner: Entity, event: TriggerEvent, info: TriggerInfo, ctx: TriggerCtx): void {
    if (!owner.alive) return;
    const list = owner.derived.triggers.filter((tr) => tr.event === event);
    for (const tr of list) {
      if (tr.requireTags && !tr.requireTags.every((x) => info.tags.includes(x))) continue;
      if (info.tags.includes('TRIGGERED')) continue; // trigger damage cannot re-trigger
      if (ctx.fired.has(tr.effectId)) continue;      // once per effectId per root event
      if ((owner.icd[tr.effectId] ?? -1) > this.t) continue;
      const sec = Math.floor(this.t / 1000);
      if (owner.trigWindow.sec !== sec) owner.trigWindow = { sec, count: 0 };
      if (ctx.depth >= B.triggerMaxDepth || ctx.count >= B.triggerMaxPerAction || owner.trigWindow.count >= B.triggerMaxPerEntityPerSec) {
        this.metrics.suppressed++;
        this.emit({ t: this.t, type: 'TRIGGER_SUPPRESSED', src: owner.id, note: tr.effectId });
        continue;
      }
      if (tr.chance < 1 && !owner.rngTrig.chance(tr.chance)) continue;
      ctx.fired.add(tr.effectId);
      ctx.count++;
      owner.trigWindow.count++;
      if (tr.icdMs > 0) owner.icd[tr.effectId] = this.t + tr.icdMs;
      if (owner.side === 'player') this.metrics.triggers++;
      this.emit({ t: this.t, type: 'TRIGGER', src: owner.id, note: tr.effectId });
      this.executeTrigger(owner, tr, info, { ...ctx, depth: ctx.depth + 1 });
    }
  }

  private executeTrigger(owner: Entity, tr: TriggerDef, info: TriggerInfo, ctx: TriggerCtx): void {
    const eff = tr.effect;
    switch (eff.kind) {
      case 'applyBleed':
        if (info.target.alive && info.physBase > 0) this.applyDot(owner, info.target, 'bleed', info.physBase, info.tags, tr.effectId);
        break;
      case 'applyPoison':
        if (info.target.alive) this.applyDot(owner, info.target, 'poison', info.physBase, info.tags, tr.effectId);
        break;
      case 'gainBarrierPctMaxHp':
        this.gainBarrier(owner, eff.value * owner.derived.maxHP, tr.effectId);
        break;
      case 'reflectPhysical': {
        const sec = Math.floor(this.t / 1000);
        if (owner.reflectWindow.sec !== sec) owner.reflectWindow = { sec, amount: 0 };
        const budget = eff.capPctMaxHpPerSec * owner.derived.maxHP - owner.reflectWindow.amount;
        const amt = Math.min(budget, eff.fraction * info.preMitigation);
        if (amt > 0 && info.attacker.alive) {
          owner.reflectWindow.amount += amt;
          this.directHit(owner, info.attacker, tr.effectId, { physical: amt }, ['REFLECT', 'TRIGGERED'], { canCrit: false, evadable: false, blockable: false, weaponHit: false, noScaling: true, root: ctx });
        }
        break;
      }
      case 'counterWeaponHit': {
        const w = owner.derived.weapon;
        if (info.attacker.alive) this.directHit(owner, info.attacker, tr.effectId, { physical: ((w.min + w.max) / 2) * eff.coefficient }, ['ATTACK', 'COUNTER', 'TRIGGERED'], { canCrit: true, evadable: true, blockable: true, weaponHit: true, root: ctx });
        break;
      }
      case 'nextAttackInc':
        owner.statuses.push({ uid: ++this.statusUid, id: `${tr.effectId}`, kind: 'buff', sourceId: owner.id, sourceLevel: owner.level, appliedAt: this.t, expireAt: this.t + 5000, mods: [{ type: 'inc', tags: ['ATTACK'], value: eff.value }] });
        break;
    }
  }

  // ---------------------------------------------------------------- actions / APL
  private conditionMet(e: Entity, skill: SkillDef, cond: PriorityRule['condition'], target: Entity | null): boolean {
    switch (cond) {
      case 'always': return true;
      case 'selfHpBelow35': return e.hp < 0.35 * e.derived.maxHP;
      case 'selfHpBelow40': return e.hp < 0.40 * e.derived.maxHP;
      case 'barrierBelow15': return e.barrier < 0.15 * e.derived.maxHP;
      case 'targetHpBelow25': return !!target && target.hp < 0.25 * target.derived.maxHP;
      case 'targetBleedStacks3': return !!target && bleedStacksFrom(target, e.id) >= 3;
      case 'buffMissing':
        if (skill.selfBuff) return !hasStatus(e, skill.selfBuff.statusId);
        if (skill.targetDebuff) return !!target && !hasStatus(target, skill.targetDebuff.statusId);
        return true;
    }
  }

  private chooseSkill(e: Entity, target: Entity | null): { skill: SkillDef; oom: boolean } {
    let oom = false;
    if (e.side === 'player') {
      const equipped = new Set(e.activeSkills ?? []);
      for (const rule of e.priority ?? []) {
        if (!equipped.has(rule.skillId)) continue;
        const skill = SKILL_BY_ID[rule.skillId];
        if (!skill) continue;
        if ((e.cooldowns[skill.id] ?? 0) > this.t) continue;
        if (skill.requiresSelfHpBelow !== undefined && !(e.hp < skill.requiresSelfHpBelow * e.derived.maxHP)) continue;
        if (!this.conditionMet(e, skill, rule.condition, target)) continue;
        if (skill.kind === 'attack' && !target) continue;
        if (e.mana < skill.manaCost) {
          oom = true;
          continue; // next valid skill
        }
        return { skill, oom };
      }
    }
    return { skill: BASIC_ATTACK, oom };
  }

  private beginAction(e: Entity): void {
    const target = this.opponentOf(e);
    if (!target) return;
    const { skill, oom } = this.chooseSkill(e, target);
    const dur = actionDuration(e, skill);
    const start = Math.min(this.t, e.nextActionAt); // exact due time (<= current tick)
    if (skill.manaCost > 0) e.mana -= skill.manaCost;
    if (skill.cooldownMs > 0) e.cooldowns[skill.id] = start + Math.round(skill.cooldownMs * (1 - capCdr(stat(e, 'cdr'))));
    e.action = { skill, start, end: start + dur, oom };
    if (e.side === 'player') {
      this.metrics.actions++;
      if (oom) this.metrics.oomMs += dur;
    }
    this.emit({ t: this.t, type: 'ACTION_BEGIN', src: e.id, tgt: target.id, skill: skill.id, v: Math.round(dur), mana: Math.floor(e.mana) });
  }

  private resolveAction(e: Entity): void {
    const act = e.action!;
    e.action = null;
    const gcd = Math.max(B.minGcdMs, act.skill.gcdMs);
    e.nextActionAt = B.gcdFrom === 'actionEnd' ? act.end + gcd : Math.max(act.end, act.start + gcd);
    const skill = act.skill;
    const target = this.opponentOf(e);
    this.emit({ t: this.t, type: 'ACTION_RESOLVE', src: e.id, tgt: target?.id, skill: skill.id });
    const root: TriggerCtx = { id: ++this.rootCounter, depth: 0, count: 0, fired: new Set() };

    if (skill.kind === 'attack') {
      if (!target) return;
      if (e.monster) {
        const hit = e.monsterHit ?? monsterBasicHit(e.monster, 1);
        this.directHit(e, target, 'monster_attack', { [e.monster.damageType]: hit }, ['ATTACK', 'MELEE'], { canCrit: true, evadable: true, blockable: true, weaponHit: true, root });
        return;
      }
      const w = e.derived.weapon;
      let coef = skill.weaponCoefficient;
      const stacks = bleedStacksFrom(target, e.id);
      if (skill.coefficientPerTargetBleed) coef += skill.coefficientPerTargetBleed * stacks;
      let extraMore = 1;
      const fin = e.derived.special.finisherMoreAtBleedStacks;
      if (fin && skill.tags.includes('FINISHER') && stacks >= fin.stacks) extraMore *= 1 + fin.more;
      const portions: Partial<Record<DamageType, number>> = { physical: ((w.min + w.max) / 2) * coef };
      for (const [dt, r] of Object.entries(w.elemental) as [DamageType, { min: number; max: number }][]) portions[dt] = ((r.min + r.max) / 2) * coef;
      if (skill.consumesTargetBleeds && stacks > 0) {
        target.statuses = target.statuses.filter((s) => !(s.id === 'bleed' && s.sourceId === e.id));
        this.emit({ t: this.t, type: 'STATUS_EXPIRE', tgt: target.id, status: 'bleed', note: `consumed:${stacks}` });
      }
      const r = this.directHit(e, target, skill.id, portions, skill.tags, { canCrit: true, evadable: true, blockable: true, weaponHit: true, extraMore, bleedChance: skill.bleedChance ?? 0, root });
      if (r.landed && skill.targetDebuff && target.alive) {
        const d = skill.targetDebuff;
        target.statuses = target.statuses.filter((s) => s.id !== d.statusId);
        this.addStatus(target, {
          id: d.statusId, kind: 'debuff', sourceId: e.id, sourceLevel: e.level, appliedAt: this.t, expireAt: this.t + d.durationMs,
          mods: d.armorReduction ? [{ type: 'stat', stat: 'armorReduction', value: d.armorReduction }] : [],
        }, 1);
      }
      return;
    }
    // buffs / heals / barriers
    if (skill.barrierPctMaxHp) this.gainBarrier(e, skill.barrierPctMaxHp * e.derived.maxHP, skill.id);
    if (skill.healPctMaxHp) this.heal(e, skill.healPctMaxHp * e.derived.maxHP, skill.id);
    if (skill.selfBuff) {
      const b = skill.selfBuff;
      e.statuses = e.statuses.filter((s) => s.id !== b.statusId); // refresh, no stacking
      this.addStatus(e, { id: b.statusId, kind: 'buff', sourceId: e.id, sourceLevel: e.level, appliedAt: this.t, expireAt: this.t + b.durationMs, mods: b.mods }, 1);
    }
  }

  private monsterAbilities(): void {
    if (this.t <= 0) return;
    for (const e of this.ordered()) {
      if (!e.alive || !e.monster) continue;
      for (const ab of e.monster.abilities) {
        if (this.t % ab.everyMs !== 0) continue;
        const target = this.opponentOf(e);
        if (!target) continue;
        const root: TriggerCtx = { id: ++this.rootCounter, depth: 0, count: 0, fired: new Set() };
        this.emit({ t: this.t, type: 'ACTION_BEGIN', src: e.id, tgt: target.id, skill: ab.id, v: 0 });
        const hit = (e.monsterHit ?? 0) * ab.hitMultiple;
        this.directHit(e, target, ab.id, { [ab.damageType]: hit }, ['ATTACK'], {
          canCrit: true, evadable: true, blockable: true, weaponHit: false, root,
          bleedChance: ab.appliesBleed ? 1 : 0, poisonChance: ab.appliesPoison ? 1 : 0,
        });
      }
    }
  }
}

interface TriggerCtx {
  id: number;
  depth: number;
  count: number;
  fired: Set<string>;
}

interface TriggerInfo {
  tags: Tag[];
  physBase: number;
  target: Entity;
  attacker: Entity;
  preMitigation: number;
  skillId: string;
}

export function simulateCombat(player: CombatantSpec, enemies: CombatantSpec[], opts: SimOptions): CombatResult {
  return new CombatSim(player, enemies, opts).run();
}

export function hashEvents(events: CombatEvent[]): string {
  return fnv1a(stableStringify(events));
}

export type { StatMap };
