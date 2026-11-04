/**
 * tests/wrap.test.js
 * Task 7 — property tests for wrapText.
 *
 * Properties:
 *  1. No output line exceeds `width` characters.
 *  2. No word whose length ≤ width is ever split mid-word.
 *  3. Joining output lines with spaces equals the whitespace-normalised input
 *     (lossless round-trip).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';

import { wrapText } from '../src/teletext/wrap.js';

// Arbitrary for a printable word (no whitespace, length 1–50)
const wordArb = fc.stringMatching(/^[^\s]{1,50}$/);

// Arbitrary for a non-empty array of words
const wordsArb = fc.array(wordArb, { minLength: 1, maxLength: 30 });

describe('wrapText', () => {
  it('no output line exceeds the requested width', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.integer({ min: 1, max: 40 }),
        (text, width) => {
          const lines = wrapText(text, width);
          for (const line of lines) {
            assert.ok(
              line.length <= width,
              `line length ${line.length} > width ${width}: "${line}"`
            );
          }
        }
      )
    );
  });

  it('no word whose length ≤ width is split across lines', () => {
    fc.assert(
      fc.property(
        wordsArb,
        fc.integer({ min: 1, max: 40 }),
        (words, width) => {
          const text  = words.join(' ');
          const lines = wrapText(text, width);

          for (const word of words) {
            if (word.length > width) continue; // hard-break is permitted
            // The word must appear intact in at least one line.
            const found = lines.some(line => {
              // The word appears as a complete token within the line.
              const tokens = line.split(' ');
              return tokens.includes(word);
            });
            assert.ok(found, `word "${word}" was split or lost. lines: ${JSON.stringify(lines)}`);
          }
        }
      )
    );
  });

  it('round-trip: all characters from input are present in output (lossless)', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.integer({ min: 1, max: 40 }),
        (text, width) => {
          const lines = wrapText(text, width);

          // Concatenating all line content (without the inter-line spaces) must
          // equal all non-whitespace characters in the input joined together.
          // When a word is hard-broken its chars appear across consecutive lines;
          // we only need to verify that no character is lost or gained.
          const inputChars  = text.replace(/\s+/g, '');
          const outputChars = lines.join('').replace(/\s+/g, '');
          assert.equal(outputChars, inputChars,
            `chars lost/gained.\n  in:  "${inputChars}"\n  out: "${outputChars}"`);
        }
      )
    );
  });

  it('round-trip: words not requiring hard-break are preserved verbatim in lines', () => {
    // Use only words whose length ≤ width; then joining lines with spaces must
    // equal the whitespace-normalised input because no mid-word break occurs.
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 40 }),
        fc.array(
          fc.string({ minLength: 1, maxLength: 40 })
            .filter(w => /^\S+$/.test(w)),
          { minLength: 1, maxLength: 20 }
        ),
        (width, words) => {
          const shortWords = words.filter(w => w.length <= width);
          if (shortWords.length === 0) return; // skip if all words are oversized
          const text       = shortWords.join(' ');
          const normalised = text.trim().split(/\s+/).filter(Boolean).join(' ');
          const lines      = wrapText(text, width);
          const rejoined   = lines.join(' ').trim().split(/\s+/).filter(Boolean).join(' ');
          assert.equal(rejoined, normalised,
            `round-trip failed for words ${JSON.stringify(shortWords)} width=${width}`);
        }
      )
    );
  });

  it('handles empty string gracefully', () => {
    const lines = wrapText('', 38);
    // Must return an array with exactly one empty string.
    assert.deepEqual(lines, ['']);
  });

  it('wraps a known sentence correctly', () => {
    const lines = wrapText('RISEN FROM THE GRAVE TELETEXT LIVES AGAIN', 20);
    for (const l of lines) assert.ok(l.length <= 20);
    // Full content preserved.
    assert.equal(lines.join(' ').trim(), 'RISEN FROM THE GRAVE TELETEXT LIVES AGAIN');
  });

  it('hard-breaks a word longer than width', () => {
    const longWord = 'A'.repeat(10);
    const lines    = wrapText(longWord, 4);
    for (const l of lines) assert.ok(l.length <= 4);
    assert.equal(lines.join(''), longWord);
  });
});
