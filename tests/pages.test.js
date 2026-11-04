/**
 * tests/pages.test.js
 * Tests for all page builders:
 *   - 24×40 invariant for every subpage
 *   - Every cell fg/bg is a valid colour
 *   - Fastext labels ≤ 9 chars, target pages are valid integers
 *   - Specific builder contracts (ghost countdown, writer share round-trip)
 *
 * Also includes fast-check property tests for writer.js encodeShare/decodeShare.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';

import { COLOURS } from '../src/teletext/grid.js';

// ── Import all builders (side-effect: they register themselves) ────────────
import { build as buildIndex   }         from '../src/pages/index.js';
import { build as buildNews,   sample as newsSample   } from '../src/pages/news.js';
import { build as buildTech,   sample as techSample   } from '../src/pages/tech.js';
import { build as buildWeather,sample as weatherSample} from '../src/pages/weather.js';
import { build as buildHistory,sample as historySample} from '../src/pages/history.js';
import { build as buildMarkets,sample as marketsSample} from '../src/pages/markets.js';
import { build as buildGhost, halloweenCountdown } from '../src/pages/ghost.js';
import { build as buildWriter,
         encodeShare, decodeShare, blankCanvas } from '../src/pages/writer.js';
import { build as buildSubs   }         from '../src/pages/subtitles.js';
import { build as buildHelp   }         from '../src/pages/help.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Assert a single page is 24×40 with valid colours and fastext labels ≤ 9.
 */
function assertPageValid(page, label) {
  assert.ok(Array.isArray(page.rows), `${label}: rows not array`);
  assert.equal(page.rows.length, 24, `${label}: row count ${page.rows.length}`);

  for (let r = 0; r < 24; r++) {
    const row = page.rows[r];
    assert.ok(Array.isArray(row), `${label}: rows[${r}] not array`);
    assert.equal(row.length, 40, `${label}: rows[${r}].length ${row.length}`);

    for (let c = 0; c < 40; c++) {
      const cell = row[c];
      assert.ok(COLOURS.includes(cell.fg), `${label}[${r}][${c}] bad fg: ${cell.fg}`);
      assert.ok(COLOURS.includes(cell.bg), `${label}[${r}][${c}] bad bg: ${cell.bg}`);
    }
  }

  // Fastext labels ≤ 9 chars.
  for (const colour of ['red', 'green', 'yellow', 'cyan']) {
    const link = page.fastext?.[colour];
    if (link != null) {
      assert.ok(typeof link.label === 'string', `${label}: fastext.${colour}.label not string`);
      assert.ok(link.label.length <= 9,
        `${label}: fastext.${colour}.label "${link.label}" > 9 chars`);
      assert.ok(typeof link.page === 'number', `${label}: fastext.${colour}.page not number`);
    }
  }
}

/**
 * Assert all pages in an array are valid and patch subpageTotal.
 */
function assertPagesValid(pages, builderName) {
  assert.ok(Array.isArray(pages), `${builderName}: did not return array`);
  assert.ok(pages.length >= 1, `${builderName}: returned empty array`);
  for (let i = 0; i < pages.length; i++) {
    assertPageValid(pages[i], `${builderName} subpage ${i + 1}/${pages.length}`);
  }
}

// ── Page 100 ──────────────────────────────────────────────────────────────

describe('page 100 — index', () => {
  it('produces a valid 24×40 page', () => {
    const pages = buildIndex(undefined, {});
    assertPagesValid(pages, 'index');
  });
});

// ── Pages 101–104 ─────────────────────────────────────────────────────────

describe('pages 101–104 — news', () => {
  it('produces valid pages with sample data', () => {
    const pages = buildNews(newsSample, {});
    assertPagesValid(pages, 'news');
  });

  it('produces a single no-data page when items empty and not stale', () => {
    const pages = buildNews({ items: [], stale: false, cacheTs: null }, {});
    assertPagesValid(pages, 'news-empty');
    assert.equal(pages.length, 1);
  });

  it('handles null data gracefully', () => {
    const pages = buildNews(null, {});
    assertPagesValid(pages, 'news-null');
  });

  it('shows cached tag when stale with cacheTs', () => {
    const pages = buildNews({ ...newsSample, stale: true, cacheTs: Date.now() }, {});
    assertPagesValid(pages, 'news-stale');
  });
});

// ── Pages 110–114 ─────────────────────────────────────────────────────────

describe('pages 110–114 — tech', () => {
  it('produces valid pages with sample data', () => {
    const pages = buildTech(techSample, {});
    assertPagesValid(pages, 'tech');
  });

  it('produces a single no-data page when items empty', () => {
    const pages = buildTech({ items: [], stale: false, cacheTs: null }, {});
    assertPagesValid(pages, 'tech-empty');
    assert.equal(pages.length, 1);
  });

  it('handles null data gracefully', () => {
    const pages = buildTech(null, {});
    assertPagesValid(pages, 'tech-null');
  });
});

// ── Page 300 ──────────────────────────────────────────────────────────────

describe('page 300 — weather', () => {
  it('produces a valid page with sample data', () => {
    const pages = buildWeather(weatherSample, {});
    assertPagesValid(pages, 'weather');
  });

  it('shows city prompt when data is null', () => {
    const pages = buildWeather(null, {});
    assertPagesValid(pages, 'weather-null');
    assert.equal(pages.length, 1);
  });

  it('shows city prompt when data has no current', () => {
    const pages = buildWeather({ stale: false, cacheTs: null }, {});
    assertPagesValid(pages, 'weather-nocurrent');
    assert.equal(pages.length, 1);
  });
});

// ── Page 400 ──────────────────────────────────────────────────────────────

describe('page 400 — history', () => {
  it('produces valid pages with sample data', () => {
    const pages = buildHistory(historySample, {});
    assertPagesValid(pages, 'history');
  });

  it('handles empty items', () => {
    const pages = buildHistory({ items: [], stale: false, cacheTs: null }, {});
    assertPagesValid(pages, 'history-empty');
    assert.equal(pages.length, 1);
  });

  it('handles null data', () => {
    const pages = buildHistory(null, {});
    assertPagesValid(pages, 'history-null');
  });
});

// ── Page 500 ──────────────────────────────────────────────────────────────

describe('page 500 — markets', () => {
  it('produces a valid page with sample data', () => {
    const pages = buildMarkets(marketsSample, {});
    assertPagesValid(pages, 'markets');
  });

  it('handles empty coins', () => {
    const pages = buildMarkets({ coins: [], stale: false, cacheTs: null }, {});
    assertPagesValid(pages, 'markets-empty');
    assert.equal(pages.length, 1);
  });

  it('handles null data', () => {
    const pages = buildMarkets(null, {});
    assertPagesValid(pages, 'markets-null');
  });
});

// ── Page 666 ──────────────────────────────────────────────────────────────

describe('page 666 — ghost', () => {
  it('produces a valid page', () => {
    const pages = buildGhost(undefined, { now: new Date('2025-10-20') });
    assertPagesValid(pages, 'ghost');
    assert.equal(pages.length, 1);
  });

  it('Halloween countdown is 0 on Oct 31', () => {
    const cd = halloweenCountdown(new Date('2025-10-31T12:00:00'));
    // days = 0, hours < 12 (counting to 23:59:59 same day)
    assert.equal(cd.days, 0);
  });

  it('Halloween countdown is positive before Oct 31', () => {
    const cd = halloweenCountdown(new Date('2025-09-01T00:00:00'));
    assert.ok(cd.days > 0, `expected days > 0, got ${cd.days}`);
  });

  it('Halloween countdown wraps to next year after Oct 31', () => {
    const cd = halloweenCountdown(new Date('2025-11-01T00:00:00'));
    assert.ok(cd.days > 300, `expected > 300 days to next Halloween, got ${cd.days}`);
  });
});

// ── Page 700 ──────────────────────────────────────────────────────────────

describe('page 700 — writer', () => {
  it('produces a valid page with blank canvas', () => {
    const pages = buildWriter(undefined, {});
    assertPagesValid(pages, 'writer');
    assert.equal(pages.length, 1);
  });

  it('encodeShare produces a non-empty URL-safe string', () => {
    const cells = blankCanvas();
    const str   = encodeShare(cells);
    assert.ok(typeof str === 'string');
    assert.ok(str.length > 0);
    // URL-safe: no +, /, or = padding.
    assert.ok(!/[+/=]/.test(str), `not URL-safe: ${str.slice(0, 40)}`);
  });

  it('decodeShare reverses encodeShare (blank canvas)', () => {
    const cells   = blankCanvas();
    const encoded = encodeShare(cells);
    const decoded = decodeShare(encoded);
    assert.ok(decoded !== null);
    assert.equal(decoded.length, 22);
    for (let r = 0; r < 22; r++) {
      assert.equal(decoded[r].length, 40);
      for (let c = 0; c < 40; c++) {
        assert.equal(decoded[r][c].ch, ' ');
        assert.equal(decoded[r][c].fg, 'white');
        assert.equal(decoded[r][c].bg, 'black');
      }
    }
  });

  it('decodeShare returns null for invalid input', () => {
    assert.equal(decodeShare(''),            null);
    assert.equal(decodeShare('!!!invalid'), null);
    assert.equal(decodeShare('aGVsbG8='),   null); // valid b64 but wrong content
  });

  it('fast-check: encodeShare/decodeShare round-trip for arbitrary cells', () => {
    const colourArb = fc.constantFrom(...COLOURS);
    const cellArb   = fc.record({
      ch: fc.char().filter(c => c.codePointAt(0) >= 32 && c.codePointAt(0) <= 126),
      fg: colourArb,
      bg: colourArb,
    });
    const rowArb   = fc.array(cellArb, { minLength: 40, maxLength: 40 });
    const canvasArb = fc.array(rowArb, { minLength: 22, maxLength: 22 });

    fc.assert(
      fc.property(canvasArb, (canvas) => {
        const encoded = encodeShare(canvas);
        const decoded = decodeShare(encoded);
        assert.ok(decoded !== null, 'decodeShare returned null');
        assert.equal(decoded.length, 22);
        for (let r = 0; r < 22; r++) {
          for (let c = 0; c < 40; c++) {
            assert.equal(decoded[r][c].ch, canvas[r][c].ch);
            assert.equal(decoded[r][c].fg, canvas[r][c].fg);
            assert.equal(decoded[r][c].bg, canvas[r][c].bg);
          }
        }
      })
    );
  });
});

// ── Page 888 ──────────────────────────────────────────────────────────────

describe('page 888 — subtitles', () => {
  it('produces a valid page with no captions', () => {
    const pages = buildSubs(undefined, { captions: [], speechSupported: true });
    assertPagesValid(pages, 'subs-empty');
    assert.equal(pages.length, 1);
  });

  it('produces a valid page with captions', () => {
    const pages = buildSubs(undefined, {
      captions: ['Hello world', 'This is a test caption', 'Another line here'],
      speechSupported: true,
    });
    assertPagesValid(pages, 'subs-captions');
  });

  it('produces a fallback page when speech not supported', () => {
    const pages = buildSubs(undefined, { speechSupported: false });
    assertPagesValid(pages, 'subs-unsupported');
    assert.equal(pages.length, 1);
  });
});

// ── Page 199 ──────────────────────────────────────────────────────────────

describe('page 199 — help', () => {
  it('produces two valid subpages', () => {
    const pages = buildHelp(undefined, {});
    assertPagesValid(pages, 'help');
    assert.equal(pages.length, 2);
  });

  it('subpageTotal is 2 on both subpages', () => {
    const pages = buildHelp(undefined, {});
    assert.equal(pages[0].subpageTotal, 2);
    assert.equal(pages[1].subpageTotal, 2);
  });
});

// ── All builders: property tests ───────────────────────────────────────────

describe('all builders: grid invariant', () => {
  const BUILDERS = [
    ['index',   () => buildIndex(undefined, {})],
    ['news',    () => buildNews(newsSample, {})],
    ['tech',    () => buildTech(techSample, {})],
    ['weather', () => buildWeather(weatherSample, {})],
    ['history', () => buildHistory(historySample, {})],
    ['markets', () => buildMarkets(marketsSample, {})],
    ['ghost',   () => buildGhost(undefined, {})],
    ['writer',  () => buildWriter(undefined, {})],
    ['subs',    () => buildSubs(undefined, { captions: ['test'] })],
    ['help',    () => buildHelp(undefined, {})],
  ];

  for (const [name, builder] of BUILDERS) {
    it(`${name}: all subpages are 24 rows × 40 cols`, () => {
      const pages = builder();
      for (const page of pages) {
        assert.equal(page.rows.length, 24);
        for (const row of page.rows) {
          assert.equal(row.length, 40);
        }
      }
    });
  }
});
