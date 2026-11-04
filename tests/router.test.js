/**
 * tests/router.test.js
 * Task 9 — property tests for parsePageInput and buildHeaderRow length.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';

import { parsePageInput } from '../src/teletext/router.js';
import { buildHeaderRow  } from '../src/teletext/grid.js';

describe('parsePageInput', () => {
  it('accepts all valid page numbers 100–899', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 899 }),
        (n) => {
          const result = parsePageInput(String(n));
          assert.equal(result, n);
        }
      )
    );
  });

  it('rejects numbers 900–999', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 900, max: 999 }),
        (n) => {
          const result = parsePageInput(String(n));
          assert.equal(result, null, `expected null for ${n}`);
        }
      )
    );
  });

  it('rejects numbers 0–99 (as zero-padded 3-digit strings)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        (n) => {
          const s      = String(n).padStart(3, '0'); // e.g. "007"
          const result = parsePageInput(s);
          assert.equal(result, null, `expected null for "${s}"`);
        }
      )
    );
  });

  it('rejects non-numeric strings', () => {
    for (const bad of ['abc', '1a3', '', 'P10', '10', '1000', ' 100']) {
      assert.equal(parsePageInput(bad), null, `expected null for "${bad}"`);
    }
  });

  it('rejects strings shorter or longer than 3 chars', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 6 }).filter(s => s.length !== 3),
        (s) => {
          assert.equal(parsePageInput(s), null);
        }
      )
    );
  });

  it('returns null for non-string input', () => {
    // @ts-ignore — intentional type violation for test
    assert.equal(parsePageInput(100),       null);
    // @ts-ignore
    assert.equal(parsePageInput(null),      null);
    // @ts-ignore
    assert.equal(parsePageInput(undefined), null);
  });
});

describe('buildHeaderRow length', () => {
  it('always returns exactly 40 cells regardless of page + date', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 899 }),
        fc.date(),
        (n, d) => {
          const cells = buildHeaderRow(n, d);
          assert.equal(cells.length, 40);
        }
      )
    );
  });
});
