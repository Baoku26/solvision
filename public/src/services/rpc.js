import { get }                    from './storage.js';
import { STORAGE_KEYS, RPC_ENDPOINTS } from '../constants.js';

const TIMEOUT_MS = 10_000;
const SPL_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

// ── Internal helpers ───────────────────────────────���───────────
function getEndpoint() {
  return get(STORAGE_KEYS.RPC_ENDPOINT) || RPC_ENDPOINTS.MAINNET_PUBLIC;
}

async function rpcCall(method, params = []) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(getEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'RPC error');
    return json.result;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('RPC timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Returns the SOL balance for `address` in SOL (not lamports).
 * On network error, returns `{ data: cachedValue, error: message }`.
 */
export async function getBalance(address, cachedValue = null) {
  try {
    const result = await rpcCall('getBalance', [address]);
    return { data: result.value / 1_000_000_000, error: null };
  } catch (err) {
    return { data: cachedValue, error: err.message };
  }
}

/**
 * Returns SPL token accounts owned by `address`.
 * Each entry: `{ mint, balance, decimals }`. Zero-balance accounts are excluded.
 */
export async function getTokenAccountsByOwner(address, cachedAccounts = null) {
  try {
    const result = await rpcCall('getTokenAccountsByOwner', [
      address,
      { programId: SPL_TOKEN_PROGRAM },
      { encoding: 'jsonParsed' },
    ]);

    const accounts = result.value
      .map(({ account }) => {
        const info = account.data.parsed.info;
        return {
          mint:     info.mint,
          balance:  info.tokenAmount.uiAmount ?? 0,
          decimals: info.tokenAmount.decimals,
        };
      })
      .filter(a => a.balance > 0);

    return { data: accounts, error: null };
  } catch (err) {
    return { data: cachedAccounts, error: err.message };
  }
}

/**
 * Returns the recent network TPS as a whole number.
 */
export async function getRecentTPS(cachedTps = null) {
  try {
    const result = await rpcCall('getRecentPerformanceSamples', [1]);
    const sample = result?.[0];
    if (!sample?.samplePeriodSecs) return { data: cachedTps, error: 'No sample data' };
    const tps = Math.round(sample.numTransactions / sample.samplePeriodSecs);
    return { data: tps, error: null };
  } catch (err) {
    return { data: cachedTps, error: err.message };
  }
}
