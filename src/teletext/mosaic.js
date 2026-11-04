/**
 * src/teletext/mosaic.js
 * Pure module — no DOM, no side effects.
 *
 * Encodes / decodes 2×3 sextant bitmaps to/from Unicode characters.
 *
 * A mosaic cell covers a 2-column × 3-row pixel block.
 * Six pixels (bits 0–5, left-to-right top-to-bottom):
 *
 *   bit 0 (top-left)   bit 1 (top-right)
 *   bit 2 (mid-left)   bit 3 (mid-right)
 *   bit 4 (bot-left)   bit 5 (bot-right)
 *
 * Mapping:
 *   bitfield = 0b000000 (0)  → U+0020 SPACE           (all clear)
 *   bitfield = 0b111111 (63) → U+2588 FULL BLOCK █    (all set)
 *   otherwise               → U+1FB00 + bitfield
 *
 * Round-trip: decode(encode(bits)) deep-equals bits for all 64 combos.
 */

const SEXTANT_BASE  = 0x1FB00;
const SPACE_CP      = 0x0020;  // ' '
const FULL_BLOCK_CP = 0x2588;  // '█'

/**
 * Encode a 6-element boolean array into a single Unicode character.
 *
 * @param {boolean[]} bits  Exactly 6 booleans [b0..b5].
 * @returns {string}        A single Unicode character.
 */
export function encode(bits) {
  if (!Array.isArray(bits) || bits.length !== 6) {
    throw new RangeError('encode() requires exactly 6 bits');
  }

  let bitfield = 0;
  for (let i = 0; i < 6; i++) {
    if (bits[i]) bitfield |= (1 << i);
  }

  if (bitfield === 0)  return String.fromCodePoint(SPACE_CP);
  if (bitfield === 63) return String.fromCodePoint(FULL_BLOCK_CP);
  return String.fromCodePoint(SEXTANT_BASE + bitfield);
}

/**
 * Decode a single Unicode character back to a 6-element boolean array.
 *
 * @param {string} ch  A single character produced by encode().
 * @returns {boolean[]} Array of 6 booleans.
 */
export function decode(ch) {
  const cp = ch.codePointAt(0);

  if (cp === SPACE_CP)      return Array(6).fill(false);
  if (cp === FULL_BLOCK_CP) return Array(6).fill(true);

  if (cp >= SEXTANT_BASE && cp <= SEXTANT_BASE + 62) {
    const bitfield = cp - SEXTANT_BASE;
    return Array.from({ length: 6 }, (_, i) => Boolean(bitfield & (1 << i)));
  }

  // Unknown character → treat as all-clear.
  return Array(6).fill(false);
}
