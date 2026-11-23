/**
 * Loads `/assets/<icon>.webp` (then `.png` as allowed alternative). If neither exists, renders a
 * styled placeholder (initials + category colour + silhouette) so the game stays fully usable.
 */
import { useState, type CSSProperties } from 'react';
import { assetUrl } from '../assets';
import type { Rarity } from '../../engine/types';

export type ImageCategory = 'item' | 'unique' | 'monster' | 'boss' | 'class' | 'skill' | 'material' | 'dungeon' | 'background' | 'slot' | 'passive';

const CATEGORY_COLOR: Record<ImageCategory, string> = {
  item: '#b8b4ac',
  unique: '#d9822b',
  monster: '#a3262b',
  boss: '#c9363b',
  class: '#c9a14a',
  skill: '#e0bb5c',
  material: '#7d9bb0',
  dungeon: '#8a4a2a',
  background: '#3a2a1a',
  slot: '#6a5e4e',
  passive: '#c9a14a',
};

/** icons known to be missing: avoid re-requesting them on every render */
const missing = new Map<string, 'png' | 'none'>();

function initials(label: string): string {
  const words = label.replace(/[^\p{L}\s-]/gu, ' ').split(/[\s-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}

interface Props {
  icon: string;
  alt: string;
  category: ImageCategory;
  size?: number;
  width?: number;
  height?: number;
  /** extra colour override for placeholders (e.g. rarity) */
  color?: string;
  className?: string;
  /** placeholder without the silhouette overlay */
  flat?: boolean;
  decorative?: boolean;
  /** rarity frame overlay (ui/frames/rarity_*) — only drawn when the frame image exists */
  frame?: Rarity;
  corrupted?: boolean;
}

export function GameImage({ icon, alt, category, size = 48, width, height, color, className, flat, decorative, frame, corrupted }: Props) {
  const listed = assetUrl(icon); // undefined = list unavailable → probe
  const known = missing.get(icon);
  const initial: 'webp' | 'png' | 'none' = listed === null ? 'none' : listed ? (listed.endsWith('.png') ? 'png' : 'webp') : known === 'none' ? 'none' : known === 'png' ? 'png' : 'webp';
  const [ext, setExt] = useState<'webp' | 'png' | 'none'>(initial);
  const frameUrl = frame ? assetUrl(`ui/frames/rarity_${frame}`) : null;
  const corruptUrl = corrupted ? assetUrl('ui/frames/rarity_corrupt') : null;
  const overlays = (
    <>
      {frameUrl && <img className="gimg-frame" src={frameUrl} alt="" aria-hidden />}
      {corruptUrl && <img className="gimg-frame" src={corruptUrl} alt="" aria-hidden />}
    </>
  );
  const w = width ?? size;
  const h = height ?? size;
  const style: CSSProperties = { width: w, height: h };
  if (ext === 'none') {
    const phStyle = { ...style, '--ph-color': color ?? CATEGORY_COLOR[category], fontSize: Math.max(10, Math.min(w, h) * 0.3) } as CSSProperties;
    return (
      <span className={`gimg ph ${flat || category === 'background' ? 'flat' : ''} ${className ?? ''}`} style={phStyle} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : alt} aria-hidden={decorative || undefined} title={decorative ? undefined : alt} data-placeholder={icon}>
        {category !== 'background' && <span className="ph-glyph">{initials(alt)}</span>}
        {overlays}
      </span>
    );
  }
  return (
    <span className={`gimg ${className ?? ''}`} style={style}>
      <img
        src={`/assets/${icon}.${ext}`}
        alt={decorative ? '' : alt}
        width={w}
        height={h}
        loading="lazy"
        onError={() => {
          const next = ext === 'webp' ? 'png' : 'none';
          missing.set(icon, next);
          setExt(next);
        }}
      />
      {overlays}
    </span>
  );
}
