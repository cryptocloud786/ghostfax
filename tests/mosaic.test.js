/**
 * tests/mosaic.test.js
 * Task 8 — property tests for mosaic encode/decode round-trip.
 *
 * All 64 bit-combinations must satisfy decode(encode(bits)) deep-equals bits.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';

import { encode, decode } from '../src/teletext/mosaic.js';

// Arbitrary for exactly-6 boolean array
const bitsArb = fc.array(fc.boolean(), { minLength: 6, maxLength: 6 });

describe('mosaic', () => {
  it('encode produces a single character for all 64 combos', () => {
    fc.assert(
      fc.property(bitsArb, (bits) => {
        const ch = encode(bits);
        assert.equal(typeof ch, 'string');
        // Ensure it is exactly 1 Unicode code point.
        assert.equal([...ch].length, 1);
      })
    );
  });

  it('decode(encode(bits)) round-trips for all 64 combos', () => {
    fc.assert(
      fc.property(bitsArb, (bits) => {
        const ch       = encode(bits);
        const decoded  = decode(ch);
        assert.deepEqual(decoded, bits);
      })
    );
  });

  // Exhaust all 64 combinations explicitly as well.
  it('round-trips all 64 explicit combinations', () => {
    for (let bf = 0; bf < 64; bf++) {
      const bits   = Array.from({ length: 6 }, (_, i) => Boolean(bf & (1 << i)));
      const ch     = encode(bits);
      const back   = decode(ch);
      assert.deepEqual(back, bits, `failed at bitfield=${bf}`);
    }
  });

  it('all-clear encodes to space', () => {
    const ch = encode([false, false, false, false, false, false]);
    assert.equal(ch, ' ');
  });

  it('all-set encodes to full block █', () => {
    const ch = encode([true, true, true, true, true, true]);
    assert.equal(ch, '█');
  });

  it('sextant characters are in range U+1FB01..U+1FB3E', () => {
    fc.assert(
      fc.property(bitsArb, (bits) => {
        // Skip all-clear and all-set.
        const bf = bits.reduce((acc, b, i) => acc | (b ? 1 << i : 0), 0);
        if (bf === 0 || bf === 63) return;
        const cp = encode(bits).codePointAt(0);
        assert.ok(cp >= 0x1FB00 && cp <= 0x1FB3F,
          `codePoint 0x${cp.toString(16)} out of sextant range`);
      })
    );
  });

  it('throws on wrong-length input', () => {
    assert.throws(() => encode([true, false]), /6 bits/);
    assert.throws(() => encode([]), /6 bits/);
  });
});
