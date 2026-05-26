import { registerView, navigateTo }           from '../app.js';
import { createTokenItem, updateTokenItem }   from '../components/token-item.js';
import { updateTPS }                          from '../components/status-bar.js';
import { getBalance, getTokenAccountsByOwner, getRecentTPS } from '../services/rpc.js';
import { getBatchPrices, getCachedPrices }    from '../services/prices.js';
import { wsMonitor }                          from '../services/websocket.js';
import { createPoller }                       from '../utils/polling.js';
import { formatPrice, formatCompact, truncateAddress } from '../utils/format.js';
import { checkPriceAlerts }                   from '../utils/alerts.js';
import { get }                                from '../services/storage.js';

import { STORAGE_KEYS, DEFAULTS, getTokenMeta } from '../constants.js';

const SOL_MINT   = 'So11111111111111111111111111111111111111112';
const WINDOW_SIZE = 6;

// ── Module state ───────────────────────────────────────────────
let _tokens          = [];
let _tokenNodes      = [];
let _windowStart     = 0;
let _focusedIdx      = 0;
let _pollers         = [];
let _container       = null;
let _cachedSol       = null;
let _cachedAccts     = null;
let _lastAddress     = null;
let _keyHandler      = null;
let _balHandler      = null;
let _settingsHandler = null;
let _wsAddress       = null;
let _fetchLock       = false;
let _bootFired       = false;

// ── Helpers ────────────────────────────────────────────────────
function _getActiveAddress() {
  const wallets = get(STORAGE_KEYS.WALLETS) || [];
  const idx     = get(STORAGE_KEYS.ACTIVE_WALLET) ?? 0;
  return wallets[idx]?.address || null;
}

function _buildTokenList(solBalance, tokenAccounts, prices) {
  const solMeta = getTokenMeta(SOL_MINT);
  const list = [{
    mint: SOL_MINT, ...solMeta,
    balance:   solBalance || 0,
    price:     prices[SOL_MINT]?.price     || 0,
    change24h: prices[SOL_MINT]?.change24h ?? null,
  }];
  for (const acct of (tokenAccounts || [])) {
    const meta = getTokenMeta(acct.mint);
    list.push({
      mint: acct.mint, ...meta,
      balance:   acct.balance,
      price:     prices[acct.mint]?.price     || 0,
      change24h: prices[acct.mint]?.change24h ?? null,
    });
  }
  return list;
}

function _fmtChange(pct) {
  if (pct === null || pct === undefined) return '—';
  return (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(2) + '%';
}

function _updatePortfolio() {
  if (!_container || !_tokens.length) return;
  let totalUSD = 0;
  let weightedNum = 0;
  for (const t of _tokens) {
    const usd = (t.balance || 0) * (t.price || 0);
    totalUSD += usd;
    weightedNum += usd * (t.change24h || 0);
  }
  const change24h = totalUSD > 0 ? weightedNum / totalUSD : null;
  const solToken  = _tokens[0];

  const elTotal  = _container.querySelector('.dash-total');
  const elChange = _container.querySelector('.dash-change');
  const elSol    = _container.querySelector('.dash-sol');
  const elStale  = _container.querySelector('.dash-stale');

  if (elTotal)  elTotal.textContent  = formatPrice(totalUSD);
  if (elChange) {
    elChange.textContent = _fmtChange(change24h);
    elChange.className   = 'dash-change ' + (
      change24h === null ? 'dim' : change24h >= 0 ? 'up' : 'down'
    );
  }
  if (elSol && solToken) {
    const solUSD = (solToken.balance || 0) * (solToken.price || 0);
    elSol.textContent = `${(solToken.balance || 0).toFixed(4)} SOL ≈ $${formatCompact(solUSD)}`;
  }

  // Stale indicator: prices older than 60s
  if (elStale) {
    const cache = get(STORAGE_KEYS.PRICE_CACHE);
    const stale = !cache?.timestamp || (Date.now() - cache.timestamp > 60_000);
    elStale.style.display = stale ? 'flex' : 'none';
  }
}

function _updateWindow() {
  const end = Math.min(_windowStart + WINDOW_SIZE, _tokens.length);
  for (let i = 0; i < _tokenNodes.length; i++) {
    const visible = i >= _windowStart && i < end;
    const el = _tokenNodes[i];
    el.style.display = visible ? '' : 'none';
    if (visible) { el.classList.add('focusable');    el.tabIndex = 0;  }
    else         { el.classList.remove('focusable'); el.tabIndex = -1; }
  }
}

function _buildNodeList(listEl) {
  listEl.innerHTML = '';
  _tokenNodes = [];
  for (let i = 0; i < _tokens.length; i++) {
    const el = createTokenItem(_tokens[i]);
    el.dataset.idx = String(i);
    el.addEventListener('click', () => {
      _focusedIdx = i;
      navigateTo('detail', { tokenIndex: i, token: { ..._tokens[i] } });
    });
    listEl.appendChild(el);
    _tokenNodes.push(el);
  }
  _updateWindow();
}

function _focusToken(idx) {
  if (idx < 0 || idx >= _tokens.length) return;
  if (idx < _windowStart) {
    _windowStart = idx;
    _updateWindow();
  } else if (idx >= _windowStart + WINDOW_SIZE) {
    _windowStart = Math.max(0, idx - WINDOW_SIZE + 1);
    _updateWindow();
  }
  _tokenNodes[idx]?.focus();
}

// ── Data fetching ──────────────────────────────────────────────
async function _fetchAll() {
  if (_fetchLock) return;
  _fetchLock = true;
  try {
    const address = _getActiveAddress();
    if (!address || !_container) return;

    const [balRes, acctsRes] = await Promise.all([
      getBalance(address, _cachedSol),
      getTokenAccountsByOwner(address, _cachedAccts),
    ]);
    _cachedSol   = balRes.data;
    _cachedAccts = acctsRes.data;

    const prices    = getCachedPrices();
    const newTokens = _buildTokenList(_cachedSol, _cachedAccts, prices);

    const needsRebuild =
      newTokens.length !== _tokens.length ||
      newTokens.some((t, i) => t.mint !== _tokens[i]?.mint);

    _tokens = newTokens;

    const listEl = _container.querySelector('#dash-token-list');
    if (!listEl) return;

    if (needsRebuild) {
      _buildNodeList(listEl);
    } else {
      for (let i = 0; i < _tokenNodes.length; i++) {
        updateTokenItem(_tokenNodes[i], _tokens[i]);
      }
    }
    _updatePortfolio();
  } finally {
    _fetchLock = false;
  }
}

async function _fetchPrices() {
  if (_tokens.length === 0) return;
  const mints = _tokens.map(t => t.mint);
  const { data: prices } = await getBatchPrices(mints);
  if (!prices) return;

  for (const t of _tokens) {
    if (prices[t.mint]) {
      t.price     = prices[t.mint].price;
      t.change24h = prices[t.mint].change24h;
    }
  }

  // Update visible nodes only
  const end = Math.min(_windowStart + WINDOW_SIZE, _tokenNodes.length);
  for (let i = _windowStart; i < end; i++) {
    updateTokenItem(_tokenNodes[i], _tokens[i]);
  }
  _updatePortfolio();

  checkPriceAlerts(prices);

  document.dispatchEvent(new CustomEvent('sv:prices-updated', {
    detail: { prices }, bubbles: false,
  }));
}

async function _fetchTPS() {
  const { data } = await getRecentTPS();
  if (data !== null) updateTPS(data);
}

// ── Arrow-key handler scoped to token list ─────────────────────
function _setupKeyHandler(container) {
  function handler(e) {
    const active = document.activeElement;
    if (!active?.classList.contains('token-item')) return;

    const idx = Number(active.dataset.idx);
    if (isNaN(idx)) return;

    if (e.key === 'ArrowDown') {
      e.stopPropagation();
      e.preventDefault();
      if (idx + 1 < _tokens.length) {
        if (idx + 1 >= _windowStart + WINDOW_SIZE) {
          _windowStart++;
          _updateWindow();
        }
        _tokenNodes[idx + 1]?.focus();
        _focusedIdx = idx + 1;
      } else {
        // End of list → wrap to settings button
        container.querySelector('.dash-settings')?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.stopPropagation();
      e.preventDefault();
      if (idx > 0) {
        if (idx - 1 < _windowStart) {
          _windowStart--;
          _updateWindow();
        }
        _tokenNodes[idx - 1]?.focus();
        _focusedIdx = idx - 1;
      } else {
        container.querySelector('.dash-settings')?.focus();
      }
    }
  }
  container.addEventListener('keydown', handler);
  return handler;
}

// ── View lifecycle ─────────────────────────────────────────────
function _render(container) {
  _container = container;
  const address = _getActiveAddress();
  container.innerHTML =
    `<div class="dash-portfolio">` +
      `<div class="dash-port-label">PORTFOLIO VALUE</div>` +
      `<div class="dash-port-addr">${truncateAddress(address || '')}</div>` +
      `<div class="dash-port-main">` +
        `<span class="dash-total">—</span>` +
        `<span class="dash-change dim">—</span>` +
        `<span class="dash-stale" style="display:none">⏱ Stale</span>` +
      `</div>` +
      `<div class="dash-sol">—</div>` +
    `</div>` +
    `<div class="dash-list-header">` +
      `<span class="dash-section-label">TOKENS</span>` +
      `<div class="dash-header-right">` +
        `<span class="dash-live-dot"></span>` +
        `<span class="dash-live-label">LIVE</span>` +
        `<button class="dash-settings focusable" tabindex="0">⚙</button>` +
      `</div>` +
    `</div>` +
    `<div class="dash-list" id="dash-token-list"></div>`;

  container.querySelector('.dash-settings').addEventListener('click', () => {
    navigateTo('settings');
  });

  if (_tokens.length > 0) {
    _buildNodeList(container.querySelector('#dash-token-list'));
    _updatePortfolio();
  }
}

function _mount(container, _params) {
  const address = _getActiveAddress();
  if (!address) { navigateTo('import'); return; }

  // Reset state if wallet changed
  if (address !== _lastAddress) {
    _lastAddress  = address;
    _windowStart  = 0;
    _focusedIdx   = 0;
    _tokens       = [];
    _tokenNodes   = [];
    _cachedSol    = null;
    _cachedAccts  = null;
    _bootFired    = false;
  }

  _keyHandler = _setupKeyHandler(container);

  // WebSocket — connect once per address
  if (address !== _wsAddress) {
    wsMonitor.connect(address);
    _wsAddress = address;
  }

  _balHandler = () => _fetchAll();
  document.addEventListener('sv:balance-changed', _balHandler);

  // Pollers
  const interval = get(STORAGE_KEYS.REFRESH_INTERVAL) || DEFAULTS.REFRESH_INTERVAL;
  const pricePoll   = createPoller(_fetchPrices, interval);
  const balancePoll = createPoller(_fetchAll,    30_000);
  const tpsPoll     = createPoller(_fetchTPS,    15_000);
  pricePoll.start();
  balancePoll.start();
  tpsPoll.start();
  _pollers = [pricePoll, balancePoll, tpsPoll];

  // React to settings changes
  _settingsHandler = ({ detail: { key, value } }) => {
    if (key === STORAGE_KEYS.REFRESH_INTERVAL) {
      _pollers[0]?.setInterval(value);
    }
    if (key === STORAGE_KEYS.RPC_ENDPOINT) {
      const addr = _getActiveAddress();
      if (addr) { wsMonitor.disconnect(); wsMonitor.connect(addr); _wsAddress = addr; }
      _fetchAll().then(() => _fetchPrices());
    }
  };
  document.addEventListener('sv:settings-changed', _settingsHandler);

  // Initial load — signals boot-complete when first data arrives
  _fetchAll().then(() => _fetchPrices()).then(() => {
    _fetchTPS();
    if (!_bootFired) {
      _bootFired = true;
      document.dispatchEvent(new Event('sv:boot-complete'));
    }
  });

  // Restore focus
  setTimeout(() => {
    if (_tokens.length > 0) _focusToken(_focusedIdx);
    else container.querySelector('.dash-settings')?.focus();
  }, 50);
}

function _unmount() {
  if (_keyHandler) {
    _container?.removeEventListener('keydown', _keyHandler);
    _keyHandler = null;
  }
  if (_balHandler) {
    document.removeEventListener('sv:balance-changed', _balHandler);
    _balHandler = null;
  }
  if (_settingsHandler) {
    document.removeEventListener('sv:settings-changed', _settingsHandler);
    _settingsHandler = null;
  }
  for (const p of _pollers) p.stop();
  _pollers = [];
}

export function register() {
  registerView('dashboard', {
    render:  _render,
    mount:   _mount,
    unmount: _unmount,
  });
}
