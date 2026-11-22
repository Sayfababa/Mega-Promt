import { useEffect, useRef, type ReactNode } from 'react';
import { MATERIAL_IDS, type MaterialId, type Materials } from '../../engine/types';
import { useGame } from '../store/gameStore';
import { MATERIAL_LABEL, materialIcon } from '../labels';
import { GameImage } from './GameImage';

export function Bar({ value, max, kind, label, animate = true, testId }: { value: number; max: number; kind: 'hp' | 'mana' | 'barrier' | 'xp'; label?: string; animate?: boolean; testId?: string }) {
  const p = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className={`bar ${kind} ${animate ? '' : 'no-anim'}`} role="meter" aria-valuemin={0} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(value)} aria-label={label ?? kind} data-testid={testId}>
      <div className="fill" style={{ width: `${p * 100}%` }} />
      {label !== undefined && kind !== 'barrier' && <div className="lbl">{label}</div>}
    </div>
  );
}

/** modal confirmation dialog — focus trapped on open, Escape cancels */
export function ConfirmDialog({ title, children, confirmLabel, danger, onConfirm, onCancel }: { title: string; children: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Tab' && boxRef.current) {
        const f = Array.from(boxRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), select, input'));
        if (f.length === 0) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onCancel]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="dlg-title" ref={boxRef}>
        <h2 id="dlg-title">{title}</h2>
        <div>{children}</div>
        <div className="actions">
          <button ref={cancelRef} onClick={onCancel}>Abbrechen</button>
          <button className={danger ? 'danger' : 'primary'} onClick={onConfirm} data-testid="confirm-ok">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} data-testid={`toast-${t.kind}`}>
          <p>{t.text}</p>
          <button className="ghost small" onClick={() => dismiss(t.id)} aria-label="Meldung schließen">✕</button>
        </div>
      ))}
    </div>
  );
}

export function MaterialList({ materials, only, compact }: { materials: Partial<Materials>; only?: MaterialId[]; compact?: boolean }) {
  const ids = (only ?? MATERIAL_IDS).filter((m) => !compact || (materials[m] ?? 0) > 0);
  if (ids.length === 0) return <p className="dim">Keine Materialien.</p>;
  return (
    <div className="mats">
      {ids.map((m) => (
        <div className="mat" key={m} data-testid={`mat-${m}`}>
          <GameImage icon={materialIcon(m)} alt={MATERIAL_LABEL[m]} category="material" size={24} flat />
          <span>{MATERIAL_LABEL[m]}</span>
          <strong>{materials[m] ?? 0}</strong>
        </div>
      ))}
    </div>
  );
}

/** button that is disabled with a VISIBLE reason (spec: no fake UI) */
export function ActionButton({ reason, onClick, children, className, testId, title }: { reason: string | null; onClick: () => void; children: ReactNode; className?: string; testId?: string; title?: string }) {
  return (
    <span className="stack" style={{ gap: 0, display: 'inline-flex' }}>
      <button className={className} disabled={!!reason} onClick={onClick} title={reason ?? title} data-testid={testId}>
        {children}
      </button>
      {reason && <span className="reason" data-testid={testId ? `${testId}-reason` : undefined}>{reason}</span>}
    </span>
  );
}
