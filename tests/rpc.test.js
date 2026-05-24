// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBalance, getTokenAccountsByOwner, getRecentTPS } from '../public/src/services/rpc.js';

// ── Fetch mock helpers ─────────────────────────────────────────
function mockFetch(result) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, result }),
  }));
}

function mockFetchError(message = 'Network error') {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(message)));
}

function mockFetchRpcError(message = 'RPC error') {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, error: { message } }),
  }));
}

afterEach(() => vi.unstubAllGlobals());

// ── getBalance ─────────────────────────────────────────────────
describe('getBalance', () => {
  it('converts lamports to SOL', async () => {
    mockFetch({ value: 2_500_000_000 }); // 2.5 SOL
    const { data, error } = await getBalance('TestAddr');
    expect(data).toBeCloseTo(2.5);
    expect(error).toBeNull();
  });

  it('returns 0 SOL for zero lamports', async () => {
    mockFetch({ value: 0 });
    const { data } = await getBalance('TestAddr');
    expect(data).toBe(0);
  });

  it('returns cachedValue on network error', async () => {
    mockFetchError('Network error');
    const { data, error } = await getBalance('TestAddr', 1.5);
    expect(data).toBe(1.5);
    expect(error).toBeTruthy();
  });

  it('returns null data when no cache and network fails', async () => {
    mockFetchError();
    const { data } = await getBalance('TestAddr');
    expect(data).toBeNull();
  });

  it('returns cachedValue on RPC error response', async () => {
    mockFetchRpcError('Block not found');
    const { data, error } = await getBalance('TestAddr', 0.5);
    expect(data).toBe(0.5);
    expect(error).toContain('Block not found');
  });

  it('sends the correct JSON-RPC method', async () => {
    mockFetch({ value: 0 });
    await getBalance('SomeAddress1234');
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1].body);
    expect(body.method).toBe('getBalance');
    expect(body.params[0]).toBe('SomeAddress1234');
  });
});

// ── getTokenAccountsByOwner ────────────────────────────────────
describe('getTokenAccountsByOwner', () => {
  const SOL_MINT   = 'So11111111111111111111111111111111111111112';
  const USDC_MINT  = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  function makeAccount(mint, uiAmount, decimals) {
    return {
      account: {
        data: {
          parsed: {
            info: {
              mint,
              tokenAmount: { uiAmount, decimals, amount: String(uiAmount) },
            },
          },
        },
      },
    };
  }

  it('parses token accounts correctly', async () => {
    mockFetch({
      value: [
        makeAccount(USDC_MINT, 100.5, 6),
        makeAccount(SOL_MINT,  2.0,   9),
      ],
    });
    const { data, error } = await getTokenAccountsByOwner('TestAddr');
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data[0]).toEqual({ mint: USDC_MINT, balance: 100.5, decimals: 6 });
  });

  it('excludes zero-balance accounts', async () => {
    mockFetch({
      value: [
        makeAccount(USDC_MINT, 0, 6),
        makeAccount(SOL_MINT,  5.0, 9),
      ],
    });
    const { data } = await getTokenAccountsByOwner('TestAddr');
    expect(data).toHaveLength(1);
    expect(data[0].mint).toBe(SOL_MINT);
  });

  it('returns empty array for wallet with no tokens', async () => {
    mockFetch({ value: [] });
    const { data } = await getTokenAccountsByOwner('TestAddr');
    expect(data).toEqual([]);
  });

  it('returns cachedAccounts on error', async () => {
    mockFetchError();
    const cached = [{ mint: USDC_MINT, balance: 50, decimals: 6 }];
    const { data, error } = await getTokenAccountsByOwner('TestAddr', cached);
    expect(data).toEqual(cached);
    expect(error).toBeTruthy();
  });
});

// ── getRecentTPS ───────────────────────────────────────────────
describe('getRecentTPS', () => {
  it('calculates TPS from sample data', async () => {
    mockFetch([{ numTransactions: 4500, samplePeriodSecs: 3 }]); // 1500 TPS
    const { data, error } = await getRecentTPS();
    expect(data).toBe(1500);
    expect(error).toBeNull();
  });

  it('rounds TPS to whole number', async () => {
    mockFetch([{ numTransactions: 1001, samplePeriodSecs: 3 }]); // 333.67 → 334
    const { data } = await getRecentTPS();
    expect(data).toBe(334);
  });

  it('returns cachedTps on error', async () => {
    mockFetchError();
    const { data, error } = await getRecentTPS(2800);
    expect(data).toBe(2800);
    expect(error).toBeTruthy();
  });

  it('handles empty sample array gracefully', async () => {
    mockFetch([]);
    const { data, error } = await getRecentTPS(1000);
    expect(data).toBe(1000);
    expect(error).toBeTruthy();
  });
});
