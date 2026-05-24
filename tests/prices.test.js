// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBatchPrices, getCachedPrices, compute24hChange, getPriceHistory } from '../public/src/services/prices.js';

const SOL  = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function mockJupiterOk(prices) {
  const data = {};
  for (const [mint, price] of Object.entries(prices)) {
    data[mint] = { id: mint, price };
  }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data, timeTaken: 0.001 }),
  }));
}

function mockFetchFail() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
}

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

afterEach(() => vi.unstubAllGlobals());

// ── getBatchPrices ─────────────────────────────────────────────
describe('getBatchPrices', () => {
  it('returns prices from Jupiter on success', async () => {
    mockJupiterOk({ [SOL]: 185.5, [USDC]: 1.0 });
    const { data, error, stale } = await getBatchPrices([SOL, USDC]);
    expect(stale).toBe(false);
    expect(error).toBeNull();
    expect(data[SOL].price).toBe(185.5);
    expect(data[USDC].price).toBe(1.0);
  });

  it('returns stale cached data when fetch fails', async () => {
    // Seed a cache entry
    localStorage.setItem('sv_price_cache', JSON.stringify({
      prices: { [SOL]: { price: 180, change24h: null } },
      timestamp: Date.now(),
    }));
    mockFetchFail();
    const { data, error, stale } = await getBatchPrices([SOL]);
    expect(stale).toBe(true);
    expect(error).toBeTruthy();
    expect(data[SOL].price).toBe(180);
  });

  it('returns empty object when fetch fails and no cache', async () => {
    mockFetchFail();
    const { data, stale } = await getBatchPrices([SOL]);
    expect(stale).toBe(true);
    expect(data).toEqual({});
  });

  it('stores result in localStorage cache', async () => {
    mockJupiterOk({ [SOL]: 200 });
    await getBatchPrices([SOL]);
    const stored = JSON.parse(localStorage.getItem('sv_price_cache'));
    expect(stored.prices[SOL].price).toBe(200);
    expect(stored.timestamp).toBeGreaterThan(0);
  });

  it('appends to price history on each successful fetch', async () => {
    mockJupiterOk({ [SOL]: 185 });
    await getBatchPrices([SOL]);
    mockJupiterOk({ [SOL]: 186 });
    await getBatchPrices([SOL]);
    const history = getPriceHistory(SOL);
    expect(history.length).toBe(2);
    expect(history[0].p).toBe(185);
    expect(history[1].p).toBe(186);
  });
});

// ── getCachedPrices ────────────────────────────────────────────
describe('getCachedPrices', () => {
  it('returns empty object when no cache', () => {
    expect(getCachedPrices()).toEqual({});
  });

  it('returns cached prices after a successful fetch', async () => {
    mockJupiterOk({ [SOL]: 190 });
    await getBatchPrices([SOL]);
    const cached = getCachedPrices();
    expect(cached[SOL].price).toBe(190);
  });
});

// ── compute24hChange ───────────────────────────────────────────
describe('compute24hChange', () => {
  it('calculates positive change correctly', () => {
    const prices  = { [SOL]: { price: 200 } };
    const history = { [SOL]: [{ p: 100, t: Date.now() - 1000 }] };
    const result  = compute24hChange(prices, history);
    expect(result[SOL]).toBeCloseTo(100); // 100% gain
  });

  it('calculates negative change correctly', () => {
    const prices  = { [SOL]: { price: 90 } };
    const history = { [SOL]: [{ p: 100, t: Date.now() - 1000 }] };
    const result  = compute24hChange(prices, history);
    expect(result[SOL]).toBeCloseTo(-10); // -10%
  });

  it('returns null when no history for mint', () => {
    const prices  = { [SOL]: { price: 200 } };
    const result  = compute24hChange(prices, {});
    expect(result[SOL]).toBeNull();
  });

  it('returns null when oldest price is zero', () => {
    const prices  = { [SOL]: { price: 200 } };
    const history = { [SOL]: [{ p: 0, t: Date.now() - 1000 }] };
    const result  = compute24hChange(prices, history);
    expect(result[SOL]).toBeNull();
  });
});

// ── token registry (getTokenMeta) ─────────────────────────────
describe('getTokenMeta', () => {
  it('returns correct metadata for known tokens', async () => {
    const { getTokenMeta } = await import('../public/src/constants.js');
    const sol = getTokenMeta('So11111111111111111111111111111111111111112');
    expect(sol.symbol).toBe('SOL');
    expect(sol.name).toBe('Solana');
    expect(sol.coingeckoId).toBe('solana');
  });

  it('returns fallback metadata for unknown mint', async () => {
    const { getTokenMeta } = await import('../public/src/constants.js');
    const unknown = getTokenMeta('unknownMintAddress000000000000000000000000');
    expect(unknown.symbol).toBe('???');
    expect(unknown.name).toContain('unkn');
    expect(unknown.coingeckoId).toBeNull();
  });

  it('includes all required tokens from the spec', async () => {
    const { TOKEN_REGISTRY } = await import('../public/src/constants.js');
    const required = ['SOL','USDC','USDT','JUP','RAY','BONK','WIF','JTO','RNDR','PYTH'];
    const symbols = Object.values(TOKEN_REGISTRY).map(t => t.symbol);
    for (const sym of required) {
      expect(symbols).toContain(sym);
    }
  });
});
