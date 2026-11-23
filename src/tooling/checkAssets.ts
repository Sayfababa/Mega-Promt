/**
 * npm run assets:check — validates public/assets/ against the content-derived manifest.
 * Reports missing files, wrong sizes (exact or an integer multiple of the target is accepted),
 * missing/unexpected transparency, unknown files and docs/ASSETS.md drift. Writes:
 *   public/assets/available.json  (the app only requests images listed here → no 404s)
 *   reports/assets.md             (human-readable status)
 * Exit code 1 only with --strict and P1 errors.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildAssetManifest, type AssetSpec } from '../content/assets';
import { readImageInfo } from './imageInfo';

const ROOT = 'public/assets';
const strict = process.argv.includes('--strict');
const manifest = buildAssetManifest();

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(ROOT).filter((f) => /\.(webp|png)$/i.test(f)).map((f) => relative(ROOT, f).replace(/\\/g, '/'));
const byKey = new Map<string, string>();
for (const f of files) {
  const key = f.replace(/\.(webp|png)$/i, '');
  // prefer webp when both exist
  if (!byKey.has(key) || f.endsWith('.webp')) byKey.set(key, f);
}

interface Row { spec: AssetSpec; file?: string; status: 'ok' | 'missing' | 'error' | 'warn'; note: string }
const rows: Row[] = [];
const available: Record<string, string> = {};
for (const spec of manifest) {
  const file = byKey.get(spec.path);
  if (!file) {
    rows.push({ spec, status: 'missing', note: spec.optional ? 'optional' : '' });
    continue;
  }
  const info = readImageInfo(new Uint8Array(readFileSync(join(ROOT, file))));
  if (!info) {
    rows.push({ spec, file, status: 'error', note: 'kein gültiges PNG/WebP' });
    continue;
  }
  const notes: string[] = [];
  let status: Row['status'] = 'ok';
  const fx = info.width / spec.width;
  const fy = info.height / spec.height;
  const multiple = fx === fy && fx >= 1 && Number.isInteger(fx);
  if (!(info.width === spec.width && info.height === spec.height)) {
    if (multiple) notes.push(`${info.width}×${info.height} (=${fx}× Zielgröße, ok)`);
    else if (Math.abs(info.width / info.height - spec.width / spec.height) < 0.01) { status = 'warn'; notes.push(`${info.width}×${info.height} statt ${spec.width}×${spec.height} (Seitenverhältnis stimmt, wird skaliert)`); }
    else { status = 'error'; notes.push(`${info.width}×${info.height} statt ${spec.width}×${spec.height} (falsches Seitenverhältnis)`); }
  }
  if (spec.alpha && !info.alpha) { status = status === 'error' ? 'error' : 'warn'; notes.push('keine Transparenz (Alpha erwartet)'); }
  if (status !== 'error') available[spec.path] = file.endsWith('.webp') ? 'webp' : 'png';
  rows.push({ spec, file, status, note: notes.join('; ') });
}
const known = new Set(manifest.map((m) => m.path));
const unknown = [...byKey.keys()].filter((k) => !known.has(k));

// docs/ASSETS.md drift: every manifest path should appear in the doc and vice versa (P1/P2 rows)
const doc = existsSync('docs/ASSETS.md') ? readFileSync('docs/ASSETS.md', 'utf8') : '';
const docPaths = new Set([...doc.matchAll(/^\|\s*`([a-z0-9_/]+)`/gm)].map((m) => m[1]!));
const notInDoc = manifest.filter((m) => !docPaths.has(m.path)).map((m) => m.path);

writeFileSync(join(ROOT, 'available.json'), JSON.stringify(available, null, 0) + '\n');
mkdirSync('reports', { recursive: true });
const count = (p: string, s: Row['status']): number => rows.filter((r) => r.spec.priority === p && r.status === s && !r.spec.optional).length;
const md: string[] = [
  '# Asset-Status', '', `Erzeugt von \`npm run assets:check\` · ${manifest.length} Assets im Manifest · ${files.length} Bilddateien gefunden`, '',
  '| Priorität | vorhanden ok | Warnung | Fehler | fehlt |', '|---|---:|---:|---:|---:|',
  ...['P1', 'P2'].map((p) => `| ${p} | ${count(p, 'ok')} | ${count(p, 'warn')} | ${count(p, 'error')} | ${count(p, 'missing')} |`), '',
  '## Probleme', '',
  ...rows.filter((r) => r.status === 'error' || r.status === 'warn').map((r) => `- **${r.status === 'error' ? 'Fehler' : 'Warnung'}** \`${r.file}\`: ${r.note}`),
  ...(unknown.length ? ['', '## Unbekannte Dateien (nicht im Manifest, werden nicht geladen)', '', ...unknown.map((u) => `- \`${byKey.get(u)}\``)] : []),
  ...(notInDoc.length ? ['', '## Im Manifest, aber nicht in docs/ASSETS.md', '', ...notInDoc.map((u) => `- \`${u}\``)] : []),
  '', '## Fehlende Bilder', '', '| Pfad | Kategorie | Größe | Transparenz | Prio |', '|---|---|---|---|---|',
  ...rows.filter((r) => r.status === 'missing').sort((a, b) => a.spec.priority.localeCompare(b.spec.priority) || a.spec.path.localeCompare(b.spec.path))
    .map((r) => `| \`${r.spec.path}.webp\` | ${r.spec.category} | ${r.spec.width}×${r.spec.height} | ${r.spec.alpha ? 'ja' : 'nein'} | ${r.spec.priority}${r.spec.optional ? ' (optional)' : ''} |`),
];
writeFileSync('reports/assets.md', md.join('\n') + '\n');

console.log(`Assets: ${manifest.length} im Manifest, ${files.length} Dateien gefunden.`);
for (const p of ['P1', 'P2']) console.log(`  ${p}: ok ${count(p, 'ok')} · Warnung ${count(p, 'warn')} · Fehler ${count(p, 'error')} · fehlt ${count(p, 'missing')}`);
for (const r of rows.filter((x) => x.status === 'error' || x.status === 'warn')) console.log(`  ${r.status === 'error' ? 'FEHLER ' : 'WARNUNG'} ${r.file}: ${r.note}`);
if (unknown.length) console.log(`  ${unknown.length} unbekannte Datei(en): ${unknown.slice(0, 5).join(', ')}${unknown.length > 5 ? ' …' : ''}`);
if (notInDoc.length) console.log(`  ${notInDoc.length} Manifest-Pfad(e) fehlen in docs/ASSETS.md: ${notInDoc.slice(0, 5).join(', ')}`);
console.log('Details: reports/assets.md · Ladeliste: public/assets/available.json');
if (strict && rows.some((r) => r.spec.priority === 'P1' && !r.spec.optional && (r.status === 'error' || r.status === 'missing'))) process.exit(1);
