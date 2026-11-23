import { deflateSync } from 'node:zlib';
import { readImageInfo } from '../../tooling/imageInfo';
import { buildAssetManifest } from '../../content/assets';
import { CLASSES } from '../../content/classes/classes';
import { MONSTERS } from '../../content/monsters/monsters';
import { SKILLS } from '../../content/skills/guardian';
import { UNIQUES } from '../../content/uniques/uniques';
import { BASES } from '../../content/bases/bases';
import { DUNGEONS } from '../../content/dungeons/dungeons';

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set([...type].map((c) => c.charCodeAt(0)), 4);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
/** real, decodable PNG (all pixels zero) */
function png(w: number, h: number, colorType: 2 | 6): Uint8Array {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h);
  ihdr.set([8, colorType, 0, 0, 0], 8);
  const bpp = colorType === 6 ? 4 : 3;
  const raw = new Uint8Array(h * (1 + w * bpp));
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
function webpVp8x(w: number, h: number, alpha: boolean): Uint8Array {
  const b = new Uint8Array(30);
  b.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
  b.set([...'WEBPVP8X'].map((c) => c.charCodeAt(0)), 8);
  b[20] = alpha ? 0x10 : 0;
  const W = w - 1, H = h - 1;
  b.set([W & 255, (W >> 8) & 255, (W >> 16) & 255, H & 255, (H >> 8) & 255, (H >> 16) & 255], 24);
  return b;
}
function webpVp8l(w: number, h: number, alpha: boolean): Uint8Array {
  const b = new Uint8Array(30);
  b.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
  b.set([...'WEBPVP8L'].map((c) => c.charCodeAt(0)), 8);
  b[20] = 0x2f;
  new DataView(b.buffer).setUint32(21, ((w - 1) & 0x3fff) | (((h - 1) & 0x3fff) << 14) | ((alpha ? 1 : 0) << 28), true);
  return b;
}

describe('image header reader', () => {
  it('reads PNG size and alpha', () => {
    expect(readImageInfo(png(128, 128, 6))).toEqual({ format: 'png', width: 128, height: 128, alpha: true });
    expect(readImageInfo(png(480, 270, 2))).toEqual({ format: 'png', width: 480, height: 270, alpha: false });
  });
  it('reads WebP VP8X and VP8L', () => {
    expect(readImageInfo(webpVp8x(1920, 1080, false))).toEqual({ format: 'webp', width: 1920, height: 1080, alpha: false });
    expect(readImageInfo(webpVp8x(768, 768, true))).toEqual({ format: 'webp', width: 768, height: 768, alpha: true });
    expect(readImageInfo(webpVp8l(128, 128, true))).toEqual({ format: 'webp', width: 128, height: 128, alpha: true });
  });
  it('rejects non-images', () => {
    expect(readImageInfo(new TextEncoder().encode('not an image at all, just text....'))).toBeNull();
  });
});

describe('asset manifest', () => {
  const m = buildAssetManifest();
  const paths = new Set(m.map((a) => a.path));
  it('covers every icon referenced by content', () => {
    for (const x of [...CLASSES, ...MONSTERS, ...SKILLS, ...UNIQUES, ...BASES, ...DUNGEONS]) expect(paths.has(x.icon)).toBe(true);
    for (const d of DUNGEONS) expect(paths.has(d.background)).toBe(true);
  });
  it('has unique paths and 108 P1 assets (docs/ASSETS.md)', () => {
    expect(paths.size).toBe(m.length);
    expect(m.filter((a) => a.priority === 'P1').length).toBe(108);
  });
});
