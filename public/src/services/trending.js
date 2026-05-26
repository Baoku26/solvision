import { TOKEN_REGISTRY } from '../constants.js';

const DEXSCREENER_URL = 'https://api.dexscreener.com/latest/dex/tokens';
const TIMEOUT_MS      = 10_000;

// Per-session dedup: same token won't alert again until page reload or settings change
const _alerted = new Set();

async function _fetchDex(mints) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${DEXSCREENER_URL}/${mints.join(',')}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// For each mint, pick the highest-volume Solana pair
function _bestPairs(data) {
  const best = {};
  for (const pair of (data.pairs || [])) {
    if (pair.chainId !== 'solana') continue;
    const addr = pair.baseToken?.address;
    if (!addr) continue;
    const vol = pair.volume?.h24 || 0;
    if (!best[addr] || vol > best[addr].vol) {
      best[addr] = {
        symbol:    pair.baseToken.symbol || TOKEN_REGISTRY[addr]?.symbol || '???',
        changeH1:  pair.priceChange?.h1  ?? null,
        changeH24: pair.priceChange?.h24 ?? null,
        vol,
      };
    }
  }
  return best;
}

/**
 * Fetches DexScreener data for all tracked tokens and returns those that
 * have moved beyond `threshold` % in `timeframe` ('h1' or 'h24').
 * Already-alerted tokens are skipped until resetTrendingAlerted() is called.
 */
export async function checkTrendingAlerts(threshold, timeframe) {
  const mints = Object.keys(TOKEN_REGISTRY);
  let data;
  try   { data = await _fetchDex(mints); }
  catch { return []; }                    // silent fail — best-effort feature

  const pairs   = _bestPairs(data);
  const results = [];

  for (const [mint, info] of Object.entries(pairs)) {
    if (_alerted.has(mint)) continue;
    const change = timeframe === 'h1' ? info.changeH1 : info.changeH24;
    if (change === null || Math.abs(change) < threshold) continue;
    _alerted.add(mint);
    results.push({ symbol: info.symbol, change, timeframe });
  }

  return results;
}

/** Clear dedup state — call when the user changes threshold or timeframe. */
export function resetTrendingAlerted() {
  _alerted.clear();
}
