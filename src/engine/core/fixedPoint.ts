/** Numeric helpers. Rounding happens only at documented boundaries (see docs/EVENT_ORDER.md). */

/** round half away from zero for positives ("kaufmännisch"), robust against 0.49999999 float noise */
export function roundHalfUp(x: number): number {
  const v = safe(x);
  const s = v < 0 ? -1 : 1;
  return s * Math.floor(Math.abs(v) + 0.5 + 1e-9);
}

/** round to one decimal place (half up) */
export function round1(x: number): number {
  return roundHalfUp(safe(x) * 10) / 10;
}

export function clamp(x: number, lo: number, hi: number): number {
  const v = safe(x);
  return v < lo ? lo : v > hi ? hi : v;
}

/** NaN/Infinity guard: replaces non-finite numbers with fallback (default 0) */
export function safe(x: number, fallback = 0): number {
  return Number.isFinite(x) ? x : fallback;
}

export function clamp01(x: number): number {
  return clamp(x, 0, 1);
}
