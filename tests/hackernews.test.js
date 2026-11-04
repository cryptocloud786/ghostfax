/**
 * tests/hackernews.test.js
 * Unit tests for src/data/hackernews.js normaliser.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { normaliseItem } from '../src/data/hackernews.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture   = JSON.parse(
  readFileSync(path.join(__dirname, 'fixtures/hackernews-item.json'), 'utf8')
);

describe('normaliseItem', () => {
  it('returns an object with required keys', () => {
    const item = normaliseItem(fixture);
    assert.ok('title'       in item);
    assert.ok('score'       in item);
    assert.ok('by'          in item);
    assert.ok('descendants' in item);
    assert.ok('urlHost'     in item);
  });

  it('title is a string of at most 120 chars', () => {
    const item = normaliseItem(fixture);
    assert.equal(typeof item.title, 'string');
    assert.ok(item.title.length <= 120, `title too long: ${item.title.length}`);
  });

  it('score is a number', () => {
    const item = normaliseItem(fixture);
    assert.equal(typeof item.score, 'number');
    assert.equal(item.score, 342);
  });

  it('by is a string', () => {
    const item = normaliseItem(fixture);
    assert.equal(typeof item.by, 'string');
    assert.equal(item.by, 'testuser');
  });

  it('descendants is a number', () => {
    const item = normaliseItem(fixture);
    assert.equal(typeof item.descendants, 'number');
    assert.equal(item.descendants, 87);
  });

  it('urlHost strips www prefix', () => {
    const item = normaliseItem(fixture);
    assert.equal(item.urlHost, 'example.com');
  });

  it('urlHost is empty string when url is missing', () => {
    const item = normaliseItem({ title: 'Ask HN', score: 10, by: 'user' });
    assert.equal(item.urlHost, '');
  });

  it('handles missing fields gracefully', () => {
    const item = normaliseItem({});
    assert.equal(item.title,       '(no title)');
    assert.equal(item.score,       0);
    assert.equal(item.by,          '');
    assert.equal(item.descendants, 0);
    assert.equal(item.urlHost,     '');
  });

  it('handles null input gracefully', () => {
    const item = normaliseItem(null);
    assert.equal(item.title, '(no title)');
    assert.equal(item.score, 0);
  });

  it('urlHost handles invalid URL', () => {
    const item = normaliseItem({ title: 'test', url: 'not-a-url' });
    assert.equal(item.urlHost, '');
  });
});
