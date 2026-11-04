/**
 * tests/grid.test.js
 * Task 6 — property tests for grid dimensions.
 * Task 9 (partial) — buildHeaderRow always returns 40 cells.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';

import { blankPage, buildHeaderRow, COLOURS } from '../src/teletext/grid.js';

// ── blankPage dimensions ───────────────────────────────────────────────────

describe('blankPage', () => {
  it('always produces exactly 24 rows', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 899 }),
        (n) => {
          const page = blankPage(n);
          assert.equal(page.rows.length, 24);
        }
      )
    );
  });

  it('every row has exactly 40 cells', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 899 }),
        (n) => {
          const page = blankPage(n);
          for (const row of page.rows) {
            assert.equal(row.length, 40);
          }
        }
      )
    );
  });

  it('every cell has valid fg and bg colours', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 899 }),
        (n) => {
          const page = blankPage(n);
          for (const row of page.rows) {
            for (const cell of row) {
              assert.ok(COLOURS.includes(cell.fg), `bad fg: ${cell.fg}`);
              assert.ok(COLOURS.includes(cell.bg), `bad bg: ${cell.bg}`);
            }
          }
        }
      )
    );
  });

  it('default cell character is a space', () => {
    const page = blankPage(100);
    for (const row of page.rows) {
      for (const cell of row) {
        assert.equal(cell.ch, ' ');
      }
    }
  });

  it('page number is stored correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 899 }),
        (n) => {
          const page = blankPage(n);
          assert.equal(page.number, n);
        }
      )
    );
  });

  it('fastext defaults to all null', () => {
    const page = blankPage(100);
    assert.equal(page.fastext.red,    null);
    assert.equal(page.fastext.green,  null);
    assert.equal(page.fastext.yellow, null);
    assert.equal(page.fastext.cyan,   null);
  });
});

// ── buildHeaderRow ─────────────────────────────────────────────────────────

describe('buildHeaderRow', () => {
  it('always returns exactly 40 cells', () => {
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

  it('every cell fg and bg is a valid colour', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 899 }),
        fc.date(),
        (n, d) => {
          const cells = buildHeaderRow(n, d);
          for (const cell of cells) {
            assert.ok(COLOURS.includes(cell.fg), `bad fg: ${cell.fg}`);
            assert.ok(COLOURS.includes(cell.bg), `bad bg: ${cell.bg}`);
          }
        }
      )
    );
  });

  it('starts with P followed by the 3-digit page number', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 899 }),
        fc.date(),
        (n, d) => {
          const cells = buildHeaderRow(n, d);
          const text = cells.map(c => c.ch).join('');
          assert.ok(text.startsWith(`P${n}`), `header="${text}" does not start with P${n}`);
        }
      )
    );
  });

  it('contains GHOSTFAX service name', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 899 }),
        fc.date(),
        (n, d) => {
          const cells = buildHeaderRow(n, d);
          const text = cells.map(c => c.ch).join('');
          assert.ok(text.includes('GHOSTFAX'), `header="${text}" missing GHOSTFAX`);
        }
      )
    );
  });
});
