#!/usr/bin/env node
/**
 * scripts/make-icons.mjs
 *
 * Generates assets/icons/icon-192.png and assets/icons/icon-512.png using
 * only Node.js built-ins (node:zlib for deflate/adler32/crc32).
 *
 * Each icon shows a white sextant-mosaic ghost on a black background with
 * a thin green (#00ff00) glow border.
 *
 * Usage:
 *   node scripts/make-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = path.join(__dirname, '..', 'assets', 'icons');

mkdirSync(OUT_DIR, { recursive: true });

// ── PNG encoder (pure, no deps) ────────────────────────────────────────────

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let c = 0xFFFFFFFF;
  for (const b of buf) c = table[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function uint32BE(n) {
  const b = new Uint8Array(4);
  const v = new DataView(b.buffer);
  v.setUint32(0, n, false);
  return b;
}

function pngChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  const len       = uint32BE(data.length);
  const crc       = crc32(Buffer.concat([typeBytes, data]));
  return Buffer.concat([len, typeBytes, data, uint32BE(crc)]);
}

/**
 * Encode an RGBA pixel array (Uint8Array, row-major) into a PNG buffer.
 * @param {number}     width
 * @param {number}     height
 * @param {Uint8Array} pixels  length = width * height * 4
 */
function encodePNG(width, height, pixels) {
  // IHDR
  const ihdrData = Buffer.alloc(13);
  const ihdrDV   = new DataView(ihdrData.buffer);
  ihdrDV.setUint32(0, width,  false);
  ihdrDV.setUint32(4, height, false);
  ihdrData[8]  = 8;   // bit depth
  ihdrData[9]  = 2;   // colour type: RGB (truecolour, no alpha channel needed
                       // but we use RGBA type=6 so we can paint with alpha)
  ihdrData[9]  = 6;   // RGBA
  ihdrData[10] = 0;   // compression
  ihdrData[11] = 0;   // filter
  ihdrData[12] = 0;   // interlace

  // Raw image data with filter bytes.
  const stride  = width * 4;
  const rawData = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    rawData[y * (stride + 1)] = 0; // filter type None
    for (let x = 0; x < width * 4; x++) {
      rawData[y * (stride + 1) + 1 + x] = pixels[y * stride + x];
    }
  }

  const compressed = deflateSync(Buffer.from(rawData));

  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Ghost shape (same 16×21 bitmap as ghost.js) ───────────────────────────

const GHOST_BITMAP = [
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1],
  [1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
  [1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1],
  [1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1],
  [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,0,1,1,1,1,0,1,1,1,1,0,1],
  [1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0],
  [0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0],
  [0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
  [0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const GHOST_W = 16;
const GHOST_H = 21;

/**
 * Draw a ghost scaled to fit in a square of `size` pixels, centred.
 * Fills pixel array (RGBA) in-place.
 */
function drawGhostIcon(pixels, size) {
  const scale = Math.floor(size / Math.max(GHOST_W, GHOST_H) * 0.65);
  const offX  = Math.floor((size - GHOST_W * scale) / 2);
  const offY  = Math.floor((size - GHOST_H * scale) / 2);

  for (let gy = 0; gy < GHOST_H; gy++) {
    for (let gx = 0; gx < GHOST_W; gx++) {
      const lit = Boolean(GHOST_BITMAP[gy]?.[gx]);
      if (!lit) continue;

      // Fill the scaled block.
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = offX + gx * scale + dx;
          const py = offY + gy * scale + dy;
          if (px < 0 || px >= size || py < 0 || py >= size) continue;
          const idx = (py * size + px) * 4;
          pixels[idx]     = 255; // R
          pixels[idx + 1] = 255; // G
          pixels[idx + 2] = 255; // B
          pixels[idx + 3] = 255; // A
        }
      }
    }
  }

  // Green glow border (2 px inset from edge).
  for (let i = 0; i < size; i++) {
    for (let t = 0; t < 2; t++) {
      const setGlow = (px, py) => {
        if (px < 0 || px >= size || py < 0 || py >= size) return;
        const idx = (py * size + px) * 4;
        // Only paint glow on black pixels (alpha == 0).
        if (pixels[idx + 3] === 0) {
          pixels[idx]     = 0;   // R
          pixels[idx + 1] = 255; // G
          pixels[idx + 2] = 0;   // B
          pixels[idx + 3] = 255; // A
        }
      };
      setGlow(t, i);             // left edge
      setGlow(size - 1 - t, i); // right edge
      setGlow(i, t);             // top edge
      setGlow(i, size - 1 - t); // bottom edge
    }
  }
}

// ── Generate icons ─────────────────────────────────────────────────────────

for (const size of [192, 512]) {
  const pixels = new Uint8Array(size * size * 4); // all zeros = transparent black
  // Fill background with opaque black.
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4 + 3] = 255; // alpha = 255 (opaque)
    // RGB remains 0 → black
  }

  drawGhostIcon(pixels, size);

  const png  = encodePNG(size, size, pixels);
  const file = path.join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(file, png);
  console.log(`Wrote ${file}  (${png.length} bytes)`);
}
