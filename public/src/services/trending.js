import { TOKEN_REGISTRY } from '../constants.js';

const DEXSCREENER_TOKENS = 'https://api.dexscreener.com/latest/dex/tokens';
const DEXSCREENER_BOOSTS = 'https://api.dexscreener.com/token-boosts/top/v1';
const TIMEOUT_MS         = 10_000;
const DISCOVERY_LIMIT    = 10; // top N boosted tokens to check each cycle

// Per-session dedup: same token won't alert again until resetTrendingAlerted()
const _alerted = new Set();

async function _get(url) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
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

function _toResults(pairs, threshold, timeframe, tag) {
  const results = [];
  for (const [mint, info] of Object.entries(pairs)) {
    if (_alerted.has(mint)) continue;
    const change = timeframe === 'h1' ? info.changeH1 : info.changeH24;
    if (change === null || Math.abs(change) < threshold) continue;
    _alerted.add(mint);
    results.push({ symbol: info.symbol, change, timeframe, tag });
  }
  return results;
}

/**
 * Price-action check for the 15 known TOKEN_REGISTRY tokens.
 * Returns those that have moved beyond `threshold` % in `timeframe`.
 */
export async function checkTrendingAlerts(threshold, timeframe) {
  const mints = Object.keys(TOKEN_REGISTRY);
  let data;
  try   { data = await _get(`${DEXSCREENER_TOKENS}/${mints.join(',')}`); }
  catch { return []; }
  return _toResults(_bestPairs(data), threshold, timeframe, 'known');
}

/**
 * Discovery check: fetches the top DexScreener-boosted Solana tokens (tokens
 * currently gaining the most momentum on-chain), then checks their price action.
 * Returns tokens not in TOKEN_REGISTRY that crossed the threshold.
 */
export async function checkTrendingDiscovery(threshold, timeframe) {
  // Step 1 — get top trending token addresses on Solana
  let boosted;
  try   { boosted = await _get(DEXSCREENER_BOOSTS); }
  catch { return []; }

  const newMints = (Array.isArray(boosted) ? boosted : [])
    .filter(b => b.chainId === 'solana' && !TOKEN_REGISTRY[b.tokenAddress] && !_alerted.has(b.tokenAddress))
    .slice(0, DISCOVERY_LIMIT)
    .map(b => b.tokenAddress);

  if (!newMints.length) return [];

  // Step 2 — fetch price data for discovered tokens
  let data;
  try   { data = await _get(`${DEXSCREENER_TOKENS}/${newMints.join(',')}`); }
  catch { return []; }

  return _toResults(_bestPairs(data), threshold, timeframe, 'discovery');
}

/** Clear dedup state — call when the user changes threshold or timeframe. */
export function resetTrendingAlerted() {
  _alerted.clear();
}
