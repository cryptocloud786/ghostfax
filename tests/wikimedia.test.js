/**
 * tests/wikimedia.test.js
 * Unit tests for src/data/wikimedia.js normalisers.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { parseNews, parseOtd, stripTags } from '../src/data/wikimedia.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture   = JSON.parse(
  readFileSync(path.join(__dirname, 'fixtures/wikimedia-featured.json'), 'utf8')
);

// ── stripTags ──────────────────────────────────────────────────────────────

describe('stripTags', () => {
  it('removes anchor tags', () => {
    const result = stripTags('<a href="/wiki/Test">Test event</a> occurred.');
    assert.ok(!result.includes('<'), 'should contain no < char');
    assert.ok(result.includes('Test event'), 'should preserve text');
  });

  it('removes bold tags', () => {
    const result = stripTags('A <b>bold</b> word.');
    assert.ok(!result.includes('<b>'));
    assert.ok(result.includes('bold'));
  });

  it('handles empty string', () => {
    assert.equal(stripTags(''), '');
  });

  it('handles null/undefined gracefully', () => {
    assert.equal(stripTags(null),      '');
    assert.equal(stripTags(undefined), '');
  });

  it('collapses multiple spaces', () => {
    const result = stripTags('hello   <span>  </span>  world');
    assert.ok(!result.includes('  '), `got: "${result}"`);
  });
});

// ── parseNews ─────────────────────────────────────────────────────────────

describe('parseNews', () => {
  it('returns an array', () => {
    const items = parseNews(fixture);
    assert.ok(Array.isArray(items));
  });

  it('returns the correct number of items', () => {
    const items = parseNews(fixture);
    assert.equal(items.length, fixture.news.length);
  });

  it('each item has title and extract strings', () => {
    const items = parseNews(fixture);
    for (const item of items) {
      assert.equal(typeof item.title,   'string');
      assert.equal(typeof item.extract, 'string');
    }
  });

  it('title does not contain HTML tags', () => {
    const items = parseNews(fixture);
    for (const item of items) {
      assert.ok(!item.title.includes('<'), `title has tags: ${item.title}`);
    }
  });

  it('extract does not contain HTML tags', () => {
    const items = parseNews(fixture);
    for (const item of items) {
      assert.ok(!item.extract.includes('<'), `extract has tags: ${item.extract}`);
    }
  });

  it('title is at most 80 chars', () => {
    const items = parseNews(fixture);
    for (const item of items) {
      assert.ok(item.title.length <= 80, `title too long: ${item.title.length}`);
    }
  });

  it('extract is at most 400 chars', () => {
    const items = parseNews(fixture);
    for (const item of items) {
      assert.ok(item.extract.length <= 400, `extract too long: ${item.extract.length}`);
    }
  });

  it('returns empty array for missing news key', () => {
    const items = parseNews({});
    assert.deepEqual(items, []);
  });

  it('filters out items with empty extract', () => {
    const raw = { news: [{ story: '', links: [] }] };
    const items = parseNews(raw);
    assert.equal(items.length, 0);
  });
});

// ── parseOtd ──────────────────────────────────────────────────────────────

describe('parseOtd', () => {
  it('returns an array', () => {
    const items = parseOtd(fixture);
    assert.ok(Array.isArray(items));
  });

  it('returns the correct number of items', () => {
    const items = parseOtd(fixture);
    assert.equal(items.length, fixture.onthisday.length);
  });

  it('each item has year (number) and text (string)', () => {
    const items = parseOtd(fixture);
    for (const item of items) {
      assert.equal(typeof item.year, 'number');
      assert.equal(typeof item.text, 'string');
    }
  });

  it('year matches fixture data', () => {
    const items = parseOtd(fixture);
    assert.equal(items[0].year, 1974);
    assert.equal(items[1].year, 1517);
  });

  it('text does not contain HTML tags', () => {
    const items = parseOtd(fixture);
    for (const item of items) {
      assert.ok(!item.text.includes('<'), `text has tags: ${item.text}`);
    }
  });

  it('text is at most 300 chars', () => {
    const items = parseOtd(fixture);
    for (const item of items) {
      assert.ok(item.text.length <= 300, `text too long: ${item.text.length}`);
    }
  });

  it('returns empty array for missing onthisday key', () => {
    const items = parseOtd({});
    assert.deepEqual(items, []);
  });
});
