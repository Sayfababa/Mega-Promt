import { B } from '../../content/balance';
import { CLASS_BY_ID } from '../../content/classes/classes';
import { BASIC_ATTACK, SKILL_BY_ID } from '../../content/skills/guardian';
import { PRIORITY_CONDITIONS } from '../../engine/state/commands';
import type { PriorityCondition, PriorityRule, SkillDef } from '../../engine/types';
import { useGame } from '../store/gameStore';
import { GameImage } from '../components/GameImage';
import { ActionButton } from '../components/common';
import { CONDITION_LABEL, fmt, pct } from '../labels';

function formula(s: SkillDef): string[] {
  const out: string[] = [];
  if (s.kind === 'attack') out.push(`Schaden: ${pct(s.weaponCoefficient, 0)} Waffenschaden${s.coefficientPerTargetBleed ? ` + ${pct(s.coefficientPerTargetBleed, 0)} je Blutungs-Stapel am Ziel` : ''}`);
  if (s.bleedChance) out.push(`Blutungschance: ${pct(s.bleedChance, 0)}`);
  if (s.barrierPctMaxHp) out.push(`Barriere: ${pct(s.barrierPctMaxHp, 0)} max. LP`);
  if (s.healPctMaxHp) out.push(`Heilung: ${pct(s.healPctMaxHp, 0)} max. LP`);
  if (s.targetDebuff) out.push(`Debuff ${s.targetDebuff.statusId}: ${fmt(s.targetDebuff.durationMs / 1000, 1)} s${s.targetDebuff.armorReduction ? `, −${pct(s.targetDebuff.armorReduction, 0)} Rüstung` : ''}`);
  if (s.selfBuff) out.push(`Buff: ${fmt(s.selfBuff.durationMs / 1000, 1)} s`);
  out.push(`Mana ${s.manaCost} · Abklingzeit ${fmt(s.cooldownMs / 1000, 1)} s · ${s.kind === 'attack' ? 'Aktionszeit = 1/Angriffe pro s' : `Wirkzeit ${fmt(s.castTimeMs / 1000, 1)} s`}`);
  return out;
}

export function SkillScreen() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const check = useGame((s) => s.check);
  const c = game.character!;
  const cls = CLASS_BY_ID[c.classId]!;
  const skills = cls.skills.map((id) => SKILL_BY_ID[id]!);
  const active = c.activeSkills;

  const setPriority = (rules: PriorityRule[]): void => {
    dispatch({ type: 'SET_SKILL_PRIORITY', rules });
  };
  const move = (i: number, d: -1 | 1): void => {
    const rules = [...c.priority];
    const j = i + d;
    if (j < 0 || j >= rules.length) return;
    [rules[i], rules[j]] = [rules[j]!, rules[i]!];
    setPriority(rules);
  };

  return (
    <div>
      <div className="screen-head">
        <h1>Skills</h1>
        <span className="sub">Aktive Slots: <strong data-testid="active-count">{active.length}</strong>/{B.activeSkillSlots}</span>
      </div>
      <div className="grid-2">
        <section className="panel">
          <h2>Skills des {cls.name}s</h2>
          {skills.map((s) => {
            const isActive = active.includes(s.id);
            const cmd = { type: 'SET_ACTIVE_SKILLS' as const, skills: isActive ? active.filter((x) => x !== s.id) : [...active, s.id] };
            const locked = s.unlockLevel > c.level;
            const reason = locked ? `Freischaltung ab Stufe ${s.unlockLevel}` : check(cmd);
            return (
              <div key={s.id} className={`skill-card ${isActive ? 'active' : ''}`} data-testid={`skill-${s.id}`}>
                <GameImage icon={s.icon} alt={s.name} category="skill" size={52} />
                <div>
                  <strong>{s.name}</strong> <small className="dim">· {s.kind === 'attack' ? 'Angriff' : s.kind === 'spell' ? 'Zauber' : 'Buff'} · ab Stufe {s.unlockLevel}</small>
                  <p style={{ margin: '0.2rem 0' }}>{s.description}</p>
                  {formula(s).map((f, i) => <div key={i} className="faint" style={{ fontSize: '0.82rem' }}>{f}</div>)}
                </div>
                <ActionButton className={isActive ? '' : 'primary'} reason={reason} onClick={() => dispatch(cmd)} testId={`skill-toggle-${s.id}`}>
                  {isActive ? 'Entfernen' : 'Aktivieren'}
                </ActionButton>
              </div>
            );
          })}
          <div className="skill-card" style={{ marginTop: '0.5rem' }}>
            <GameImage icon={BASIC_ATTACK.icon} alt={BASIC_ATTACK.name} category="skill" size={52} />
            <div><strong>{BASIC_ATTACK.name}</strong><p className="dim" style={{ margin: 0 }}>{BASIC_ATTACK.description} Wird genutzt, wenn kein Skill der Prioritätsliste möglich ist.</p></div>
            <span className="faint">immer</span>
          </div>
        </section>
        <section className="panel" data-testid="priority-list">
          <h2>Prioritätsliste</h2>
          <p className="dim">Im Kampf wird von oben nach unten der erste Skill gewählt, dessen Bedingung erfüllt ist und der bereit ist (Mana, Abklingzeit).</p>
          {c.priority.length === 0 && <p className="faint">Keine aktiven Skills.</p>}
          {c.priority.map((r, i) => {
            const sk = SKILL_BY_ID[r.skillId];
            return (
              <div className="prio-row" key={r.skillId}>
                <span className="num gold" style={{ color: 'var(--gold)' }}>{i + 1}.</span>
                <span>{sk?.name ?? r.skillId}</span>
                <select
                  aria-label={`Bedingung für ${sk?.name ?? r.skillId}`}
                  value={r.condition}
                  onChange={(e) => setPriority(c.priority.map((x, k) => (k === i ? { ...x, condition: e.target.value as PriorityCondition } : x)))}
                  data-testid={`prio-cond-${r.skillId}`}
                >
                  {PRIORITY_CONDITIONS.map((pc) => <option key={pc} value={pc}>{CONDITION_LABEL[pc]}</option>)}
                </select>
                <span className="row" style={{ gap: '0.2rem', flexWrap: 'nowrap' }}>
                  <button className="small" disabled={i === 0} title={i === 0 ? 'Bereits ganz oben' : 'Nach oben'} aria-label={`${sk?.name} nach oben`} onClick={() => move(i, -1)}>▲</button>
                  <button className="small" disabled={i === c.priority.length - 1} title={i === c.priority.length - 1 ? 'Bereits ganz unten' : 'Nach unten'} aria-label={`${sk?.name} nach unten`} onClick={() => move(i, 1)}>▼</button>
                </span>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
