/** Minimal PNG / WebP header reader: dimensions + alpha channel presence (no dependencies). */
export interface ImageInfo { format: 'png' | 'webp'; width: number; height: number; alpha: boolean }

export function readImageInfo(buf: Uint8Array): ImageInfo | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const ascii = (o: number, n: number): string => String.fromCharCode(...buf.subarray(o, o + n));
  // PNG: signature + IHDR
  if (buf.length >= 33 && buf[0] === 0x89 && ascii(1, 3) === 'PNG' && ascii(12, 4) === 'IHDR') {
    const width = dv.getUint32(16);
    const height = dv.getUint32(20);
    const colorType = buf[25]!;
    let alpha = colorType === 4 || colorType === 6;
    if (!alpha) {
      // tRNS chunk also provides transparency
      let o = 8;
      while (o + 8 <= buf.length) {
        const len = dv.getUint32(o);
        const type = ascii(o + 4, 4);
        if (type === 'tRNS') { alpha = true; break; }
        if (type === 'IDAT' || type === 'IEND') break;
        o += 12 + len;
      }
    }
    return { format: 'png', width, height, alpha };
  }
  // WebP: RIFF....WEBP + VP8 / VP8L / VP8X
  if (buf.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4);
    if (chunk === 'VP8X') {
      const flags = buf[20]!;
      const width = 1 + (buf[24]! | (buf[25]! << 8) | (buf[26]! << 16));
      const height = 1 + (buf[27]! | (buf[28]! << 8) | (buf[29]! << 16));
      return { format: 'webp', width, height, alpha: (flags & 0x10) !== 0 };
    }
    if (chunk === 'VP8L') {
      const b = dv.getUint32(21, true);
      return { format: 'webp', width: (b & 0x3fff) + 1, height: ((b >>> 14) & 0x3fff) + 1, alpha: ((b >>> 28) & 1) === 1 };
    }
    if (chunk === 'VP8 ') {
      return { format: 'webp', width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff, alpha: false };
    }
  }
  return null;
}
