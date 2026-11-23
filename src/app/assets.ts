/**
 * Asset availability. `npm run assets:check` writes /assets/available.json (path → 'webp'|'png').
 * When the list is loaded, only listed images are requested (no 404s); UI textures are applied as
 * CSS custom properties only if present. Without the list, GameImage falls back to probing.
 */
let available: Record<string, 'webp' | 'png'> | null = null;

export function assetsKnown(): boolean {
  return available !== null;
}

/** URL for an asset key, null when known to be missing, undefined when availability is unknown */
export function assetUrl(icon: string): string | null | undefined {
  if (!available) return undefined;
  const ext = available[icon];
  return ext ? `/assets/${icon}.${ext}` : null;
}

export function hasAsset(icon: string): boolean {
  return !!assetUrl(icon);
}

const CSS_TEXTURES: Record<string, string> = {
  '--tex-panel': 'ui/panel_texture',
  '--tex-btn': 'ui/buttons/button_normal',
  '--tex-btn-hover': 'ui/buttons/button_hover',
  '--tex-btn-pressed': 'ui/buttons/button_pressed',
  '--tex-btn-disabled': 'ui/buttons/button_disabled',
  '--tex-xp-frame': 'ui/xp_bar_frame',
  '--tex-xp-fill': 'ui/xp_bar_fill',
  '--tex-frame-normal': 'ui/frames/rarity_normal',
  '--tex-frame-magic': 'ui/frames/rarity_magic',
  '--tex-frame-rare': 'ui/frames/rarity_rare',
  '--tex-frame-unique': 'ui/frames/rarity_unique',
  '--tex-frame-corrupt': 'ui/frames/rarity_corrupt',
  '--tex-talent-root-on': 'ui/talent/root_active',
  '--tex-talent-root-off': 'ui/talent/root_inactive',
  '--tex-talent-small-on': 'ui/talent/small_active',
  '--tex-talent-small-off': 'ui/talent/small_inactive',
  '--tex-talent-medium-on': 'ui/talent/medium_active',
  '--tex-talent-medium-off': 'ui/talent/medium_inactive',
  '--tex-talent-key-on': 'ui/talent/key_active',
  '--tex-talent-key-off': 'ui/talent/key_inactive',
};

function applyTextures(): void {
  const root = document.documentElement;
  for (const [prop, icon] of Object.entries(CSS_TEXTURES)) {
    const url = assetUrl(icon);
    if (url) root.style.setProperty(prop, `url("${url}")`);
  }
  if (hasAsset('ui/panel_texture')) root.classList.add('tex-panel');
  if (hasAsset('ui/buttons/button_normal')) root.classList.add('tex-buttons');
  if (hasAsset('ui/xp_bar_frame') && hasAsset('ui/xp_bar_fill')) root.classList.add('tex-xp');
  if (hasAsset('ui/talent/small_active')) root.classList.add('tex-talent');
  const fav = assetUrl('ui/favicon');
  if (fav) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = fav;
    document.head.appendChild(link);
  }
}

export async function loadAvailableAssets(timeoutMs = 1500): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch('/assets/available.json', { cache: 'no-cache', signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return;
    const data: unknown = await res.json();
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      available = Object.fromEntries(Object.entries(data as Record<string, unknown>).filter(([, v]) => v === 'webp' || v === 'png')) as Record<string, 'webp' | 'png'>;
      applyTextures();
    }
  } catch {
    // offline / no list → GameImage probes individually
  }
}
