/**
 * tests/markets.test.js
 * Unit tests for src/data/markets.js normalisers.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { normaliseMarkets, normaliseCoinbase } from '../src/data/markets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cgFixture = JSON.parse(
  readFileSync(path.join(__dirname, 'fixtures/coingecko-price.json'), 'utf8')
);
const cbFixture = JSON.parse(
  readFileSync(path.join(__dirname, 'fixtures/coinbase-rates.json'), 'utf8')
);

// ── normaliseMarkets (CoinGecko) ──────────────────────────────────────────

describe('normaliseMarkets (CoinGecko)', () => {
  it('returns an array of 3 coins', () => {
    const coins = normaliseMarkets(cgFixture);
    assert.equal(coins.length, 3);
  });

  it('symbols are BTC, ETH, SOL in order', () => {
    const coins = normaliseMarkets(cgFixture);
    assert.equal(coins[0].symbol, 'BTC');
    assert.equal(coins[1].symbol, 'ETH');
    assert.equal(coins[2].symbol, 'SOL');
  });

  it('each coin has usd, inr as numbers', () => {
    const coins = normaliseMarkets(cgFixture);
    for (const coin of coins) {
      assert.equal(typeof coin.usd, 'number', `${coin.symbol} usd not number`);
      assert.equal(typeof coin.inr, 'number', `${coin.symbol} inr not number`);
    }
  });

  it('usd_24h and inr_24h are numbers (not null) when present in fixture', () => {
    const coins = normaliseMarkets(cgFixture);
    for (const coin of coins) {
      assert.equal(typeof coin.usd_24h, 'number', `${coin.symbol} usd_24h not number`);
      assert.equal(typeof coin.inr_24h, 'number', `${coin.symbol} inr_24h not number`);
    }
  });

  it('BTC usd price matches fixture', () => {
    const coins = normaliseMarkets(cgFixture);
    assert.equal(coins[0].usd, cgFixture.bitcoin.usd);
  });

  it('ETH has negative 24h change', () => {
    const coins = normaliseMarkets(cgFixture);
    assert.ok(coins[1].usd_24h < 0, `ETH 24h change should be negative: ${coins[1].usd_24h}`);
  });

  it('SOL has positive 24h change', () => {
    const coins = normaliseMarkets(cgFixture);
    assert.ok(coins[2].usd_24h > 0, `SOL 24h change should be positive: ${coins[2].usd_24h}`);
  });

  it('handles missing coin data gracefully', () => {
    const coins = normaliseMarkets({});
    assert.equal(coins.length, 3);
    for (const coin of coins) {
      assert.equal(coin.usd,     0);
      assert.equal(coin.inr,     0);
      // 24h change is null when the field is absent
      assert.equal(coin.usd_24h, null);
      assert.equal(coin.inr_24h, null);
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

// ── normaliseCoinbase ─────────────────────────────────────────────────────

describe('normaliseCoinbase (Coinbase fallback)', () => {
  it('returns an array of 3 coins', () => {
    const coins = normaliseCoinbase(cbFixture);
    assert.equal(coins.length, 3);
  });

  it('symbols are BTC, ETH, SOL in order', () => {
    const coins = normaliseCoinbase(cbFixture);
    assert.equal(coins[0].symbol, 'BTC');
    assert.equal(coins[1].symbol, 'ETH');
    assert.equal(coins[2].symbol, 'SOL');
  });

  it('usd and inr are positive numbers', () => {
    const coins = normaliseCoinbase(cbFixture);
    for (const coin of coins) {
      assert.ok(coin.usd > 0, `${coin.symbol} usd should be > 0`);
      assert.ok(coin.inr > 0, `${coin.symbol} inr should be > 0`);
    }
  });

  it('BTC USD matches fixture', () => {
    const coins = normaliseCoinbase(cbFixture);
    assert.equal(coins[0].usd, Number(cbFixture.bitcoin.rates.USD));
  });

  it('BTC INR matches fixture', () => {
    const coins = normaliseCoinbase(cbFixture);
    assert.equal(coins[0].inr, Number(cbFixture.bitcoin.rates.INR));
  });

  it('usd_24h and inr_24h are null (Coinbase does not supply change)', () => {
    const coins = normaliseCoinbase(cbFixture);
    for (const coin of coins) {
      assert.equal(coin.usd_24h, null, `${coin.symbol} usd_24h should be null`);
      assert.equal(coin.inr_24h, null, `${coin.symbol} inr_24h should be null`);
    }
  });

  it('handles missing rates gracefully', () => {
    const coins = normaliseCoinbase({});
    assert.equal(coins.length, 3);
    for (const coin of coins) {
      assert.equal(coin.usd, 0);
      assert.equal(coin.inr, 0);
      assert.equal(coin.usd_24h, null);
      assert.equal(coin.inr_24h, null);
    }
  });

  it('handles null input gracefully', () => {
    const coins = normaliseCoinbase(null);
    assert.equal(coins.length, 3);
    for (const coin of coins) {
      assert.equal(coin.usd, 0);
    }
  });
});
