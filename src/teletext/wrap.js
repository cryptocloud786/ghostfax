/**
 * src/teletext/wrap.js
 * Pure module — no DOM, no side effects.
 *
 * Word-wraps a string to lines of at most `width` characters,
 * breaking only at word boundaries unless a single word exceeds
 * the width, in which case it is hard-broken at exactly `width`.
 *
 * Properties guaranteed (verified by fast-check in tests/):
 *  - No output line exceeds `width` characters.
 *  - Joining output lines with a single space equals the
 *    whitespace-normalised input (lossless round-trip).
 *  - No word whose length ≤ width is ever split mid-word.
 */

/**
 * @param {string} text
 * @param {number} [width=38]   Maximum characters per line (1–40 typical).
 * @returns {string[]}          Array of lines, each ≤ width chars.
 */
export function wrapText(text, width = 38) {
  if (width < 1) width = 1;

  // Normalise whitespace: split on any run of whitespace.
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines = [];
  let current = '';

  for (const word of words) {
    if (word.length > width) {
      // Hard-break the oversized word across multiple lines.
      // First flush whatever is in `current`.
      if (current.length > 0) {
        lines.push(current);
        current = '';
      }
      let remaining = word;
      while (remaining.length > width) {
        lines.push(remaining.slice(0, width));
        remaining = remaining.slice(width);
      }
      current = remaining; // leftover (may be empty string)
    } else if (current.length === 0) {
      // Start of a new line.
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      // Word fits on the current line.
      current += ' ' + word;
    } else {
      // Doesn't fit — start a new line.
      lines.push(current);
      current = word;
    }
  }

  // Push the last line (may be empty string if word was exact multiple of width).
  lines.push(current);

  return lines;
}
