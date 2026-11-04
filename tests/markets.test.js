/**
 * tests/markets.test.js
 * Unit tests for src/data/markets.js normaliser.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { normaliseMarkets } from '../src/data/markets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture   = JSON.parse(
  readFileSync(path.join(__dirname, 'fixtures/coingecko-price.json'), 'utf8')
);

describe('normaliseMarkets', () => {
  it('returns an array of 3 coins', () => {
    const coins = normaliseMarkets(fixture);
    assert.equal(coins.length, 3);
  });

  it('symbols are BTC, ETH, SOL in order', () => {
    const coins = normaliseMarkets(fixture);
    assert.equal(coins[0].symbol, 'BTC');
    assert.equal(coins[1].symbol, 'ETH');
    assert.equal(coins[2].symbol, 'SOL');
  });

  it('each coin has usd, inr, usd_24h, inr_24h as numbers', () => {
    const coins = normaliseMarkets(fixture);
    for (const coin of coins) {
      assert.equal(typeof coin.usd,     'number', `${coin.symbol} usd not number`);
      assert.equal(typeof coin.inr,     'number', `${coin.symbol} inr not number`);
      assert.equal(typeof coin.usd_24h, 'number', `${coin.symbol} usd_24h not number`);
      assert.equal(typeof coin.inr_24h, 'number', `${coin.symbol} inr_24h not number`);
    }
  });

  it('BTC usd price matches fixture', () => {
    const coins = normaliseMarkets(fixture);
    assert.equal(coins[0].usd, fixture.bitcoin.usd);
  });

  it('ETH has negative 24h change', () => {
    const coins = normaliseMarkets(fixture);
    assert.ok(coins[1].usd_24h < 0, `ETH 24h change should be negative: ${coins[1].usd_24h}`);
  });

  it('SOL has positive 24h change', () => {
    const coins = normaliseMarkets(fixture);
    assert.ok(coins[2].usd_24h > 0, `SOL 24h change should be positive: ${coins[2].usd_24h}`);
  });

  it('handles missing coin data gracefully', () => {
    const coins = normaliseMarkets({});
    assert.equal(coins.length, 3);
    for (const coin of coins) {
      assert.equal(coin.usd,     0);
      assert.equal(coin.inr,     0);
      assert.equal(coin.usd_24h, 0);
      assert.equal(coin.inr_24h, 0);
    }
  });

  it('handles null input gracefully', () => {
    const coins = normaliseMarkets(null);
    assert.equal(coins.length, 3);
    for (const coin of coins) {
      assert.equal(coin.usd, 0);
    }
  });
});
