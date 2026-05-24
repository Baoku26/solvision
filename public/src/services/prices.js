import { get, set }                    from './storage.js';
import { STORAGE_KEYS, TOKEN_REGISTRY } from '../constants.js';

const JUPITER_URL   = 'https://price.jup.ag/v4/price';
const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';
const TIMEOUT_MS    = 10_000;
const HISTORY_MAX_POINTS = 30;
const HISTORY_MAX_AGE_MS = 24 * 60 * 60 * 1000;   // 24 h
const FALLBACK_WINDOW_MS =  5 * 60 * 1000;          // 5 min

// ── Module-level state ─────────────────────────────────────────
// Note: _consecutiveFails and _fallbackUntil are intentionally module-scoped
// (survive for the session lifetime). No in-memory price cache — always
// read from localStorage so there are no stale-reference surprises.
let _consecutiveFails  = 0;
let _fallbackUntil     = 0;      // epoch ms; use CoinGecko until this time

// ── Internal helpers ───────────────────────────────────────────
async function fetchJSON(url) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Price fetch timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJupiter(mints) {
  const data = await fetchJSON(`${JUPITER_URL}?ids=${mints.join(',')}`);
  const out = {};
  for (const [id, info] of Object.entries(data.data ?? {})) {
    out[id] = { price: info.price ?? 0, change24h: null };
  }
  return out;
}

async function fetchCoinGecko(mints) {
  const cgIds = mints
    .map(m => TOKEN_REGISTRY[m]?.coingeckoId)
    .filter(Boolean);
  if (!cgIds.length) return {};

  const params = new URLSearchParams({
    ids: cgIds.join(','),
    vs_currencies: 'usd',
    include_24hr_change: 'true',
  });
  const data = await fetchJSON(`${COINGECKO_URL}?${params}`);

  const out = {};
  for (const mint of mints) {
    const cgId = TOKEN_REGISTRY[mint]?.coingeckoId;
    if (cgId && data[cgId]) {
      out[mint] = {
        price:     data[cgId].usd           ?? 0,
        change24h: data[cgId].usd_24h_change ?? null,
      };
    }
  }
  return out;
}

// ── Price history ──────────────────────────────────────────────
function loadHistory() {
  return get(STORAGE_KEYS.PRICE_HISTORY) ?? {};
}

function appendHistory(prices) {
  const now     = Date.now();
  const history = loadHistory();
  const cutoff  = now - HISTORY_MAX_AGE_MS;

  for (const [mint, { price }] of Object.entries(prices)) {
    const pts = (history[mint] ?? [])
      .filter(p => p.t > cutoff)       // prune stale
      .slice(-(HISTORY_MAX_POINTS - 1)); // keep max - 1 to make room
    pts.push({ p: price, t: now });
    history[mint] = pts;
  }

  set(STORAGE_KEYS.PRICE_HISTORY, history);
  return history;
}

/**
 * Given current prices, compute 24h change (%) from the oldest stored data point.
 * Returns null when no historical data is available for a mint.
 */
export function compute24hChange(prices, history) {
  const result = {};
  for (const [mint, { price }] of Object.entries(prices)) {
    const pts = history[mint];
    if (!pts?.length) { result[mint] = null; continue; }
    const oldest = pts[0].p;
    result[mint] = oldest === 0 ? null : ((price - oldest) / oldest) * 100;
  }
  return result;
}

// ── Cache helpers ──────────────────────────────────────────────
function saveCache(prices) {
  set(STORAGE_KEYS.PRICE_CACHE, { prices, timestamp: Date.now() });
}

function getStoredCache() {
  const stored = get(STORAGE_KEYS.PRICE_CACHE);
  if (!stored) return null;
  if (Date.now() - stored.timestamp > HISTORY_MAX_AGE_MS) return null;
  return stored;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Fetches current prices for a list of Solana mint addresses.
 *
 * Returns `{ data: { [mint]: { price, change24h } }, error, stale }`.
 * Falls back to CoinGecko after 3 consecutive Jupiter failures.
 * Falls back to cached data when all fetches fail.
 */
export async function getBatchPrices(mintAddresses) {
  const useCoinGecko = Date.now() < _fallbackUntil;

  try {
    const raw = useCoinGecko
      ? await fetchCoinGecko(mintAddresses)
      : await fetchJupiter(mintAddresses);

    _consecutiveFails = 0;
    saveCache(raw);

    // Enrich with 24h change from history (Jupiter doesn't provide it)
    const history = appendHistory(raw);
    const changes = compute24hChange(raw, history);
    const prices = Object.fromEntries(
      Object.entries(raw).map(([mint, v]) => [
        mint,
        { price: v.price, change24h: v.change24h ?? changes[mint] },
      ])
    );

    return { data: prices, error: null, stale: false };
  } catch (err) {
    _consecutiveFails++;

    if (_consecutiveFails >= 3 && !useCoinGecko) {
      _fallbackUntil = Date.now() + FALLBACK_WINDOW_MS;
    }

    const cached = getStoredCache();
    return { data: cached?.prices ?? {}, error: err.message, stale: true };
  }
}

/** Returns the last successful prices from memory or localStorage (no network). */
export function getCachedPrices() {
  return getStoredCache()?.prices ?? {};
}

/** Exposes stored price history for sparkline rendering. */
export function getPriceHistory(mint) {
  return loadHistory()[mint] ?? [];
}
