import { get, set }                             from '../services/storage.js';
import { STORAGE_KEYS, DEFAULTS, TOKEN_REGISTRY,
         RPC_ENDPOINTS }                         from '../constants.js';
import { registerView, navigateTo }              from '../app.js';
import { pushNotification }                      from '../components/notification.js';
import { getCachedPrices }                       from '../services/prices.js';
import { formatPrice }                           from '../utils/format.js';

// ── Constants ──────────────────────────────────────────────────
const VERSION         = '1.0.0';
const REFRESH_CYCLE   = [5_000, 10_000, 30_000, 60_000];
const CURRENCY_CYCLE  = ['USD', 'EUR', 'GBP', 'NGN'];
const FILTER_LABELS   = { all: 'All', nonzero: 'Non-zero' };
const TOKEN_WINDOW    = 8;  // visible tokens in picker
const ALERTS_WINDOW   = 6;  // visible alerts in list

const RPC_PRESETS = [
  { label: 'Public',    key: 'public' },
  { label: 'Helius',    key: 'helius' },
  { label: 'QuickNode', key: 'quicknode' },
];

// ── Module state ───────────────────────────────────────────────
let _container          = null;
let _mode               = 'menu';
let _menuFocusIdx       = 0;
let _alertsFocusIdx     = 0;
let _tokenWindowStart   = 0;
let _alertsWindowStart  = 0;
let _alertDraft         = null;

// ── Helpers ────────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cycleArr(arr, current) {
  const i = arr.indexOf(current);
  return arr[(i + 1) % arr.length];
}

function getRpcPreset() {
  const ep = get(STORAGE_KEYS.RPC_ENDPOINT) || '';
  if (ep === RPC_ENDPOINTS.HELIUS_PROXY)   return 'helius';
  if (ep.includes('quicknode'))             return 'quicknode';
  return 'public';
}

function getRpcLabel() {
  return RPC_PRESETS.find(p => p.key === getRpcPreset())?.label || 'Public';
}

function getRefreshLabel() {
  const ms = get(STORAGE_KEYS.REFRESH_INTERVAL) || DEFAULTS.REFRESH_INTERVAL;
  return ms >= 60_000 ? '60s' : ms >= 30_000 ? '30s' : ms >= 10_000 ? '10s' : '5s';
}

function getActiveWalletLabel() {
  const wallets = get(STORAGE_KEYS.WALLETS) || [];
  const idx = get(STORAGE_KEYS.ACTIVE_WALLET) ?? 0;
  return wallets[idx]?.label || 'None';
}

function getAlertCountLabel() {
  const n = (get(STORAGE_KEYS.PRICE_ALERTS) || []).filter(a => !a.triggered).length;
  return n === 0 ? 'None' : `${n} active`;
}

function dispatch(key, value) {
  document.dispatchEvent(new CustomEvent('sv:settings-changed', { detail: { key, value } }));
}

// ── Actions ────────────────────────────────────────────────────
function cycleRefresh() {
  const curr = get(STORAGE_KEYS.REFRESH_INTERVAL) || DEFAULTS.REFRESH_INTERVAL;
  const next = cycleArr(REFRESH_CYCLE, curr);
  set(STORAGE_KEYS.REFRESH_INTERVAL, next);
  dispatch(STORAGE_KEYS.REFRESH_INTERVAL, next);
  renderMenu();
}

function cycleCurrency() {
  const curr = get(STORAGE_KEYS.CURRENCY) || DEFAULTS.CURRENCY;
  const next = cycleArr(CURRENCY_CYCLE, curr);
  set(STORAGE_KEYS.CURRENCY, next);
  dispatch(STORAGE_KEYS.CURRENCY, next);
  renderMenu();
}

function cycleFilter() {
  const curr = get(STORAGE_KEYS.TOKEN_FILTER) || DEFAULTS.TOKEN_FILTER;
  const next = curr === 'all' ? 'nonzero' : 'all';
  set(STORAGE_KEYS.TOKEN_FILTER, next);
  dispatch(STORAGE_KEYS.TOKEN_FILTER, next);
  renderMenu();
}

function setRpcPreset(key) {
  if (key === 'public') set(STORAGE_KEYS.RPC_ENDPOINT, RPC_ENDPOINTS.MAINNET_PUBLIC);
  if (key === 'helius') set(STORAGE_KEYS.RPC_ENDPOINT, RPC_ENDPOINTS.HELIUS_PROXY);
  // quicknode: no URL until user configures it via companion page
  // For helius/quicknode: mark as selected so display updates, but don't break the endpoint
  // (actual URL would be configured via companion page in a future release).
  dispatch(STORAGE_KEYS.RPC_ENDPOINT, key);
  _mode = 'menu';
  renderMenu();
}

// ── Menu items ─────────────────────────────────────────────────
function getMenuItems() {
  return [
    { id: 'wallet',   label: 'Active Wallet',  value: esc(getActiveWalletLabel()),           arrow: '›',  action: () => navigateTo('manage') },
    { id: 'rpc',      label: 'RPC Endpoint',    value: getRpcLabel(),                         arrow: '›',  action: showRpc },
    { id: 'refresh',  label: 'Price Refresh',   value: getRefreshLabel(),                     arrow: '⟳',  action: cycleRefresh },
    { id: 'currency', label: 'Currency',        value: get(STORAGE_KEYS.CURRENCY) || DEFAULTS.CURRENCY, arrow: '⟳', action: cycleCurrency },
    { id: 'filter',   label: 'Token Filter',    value: FILTER_LABELS[get(STORAGE_KEYS.TOKEN_FILTER) || DEFAULTS.TOKEN_FILTER], arrow: '⟳', action: cycleFilter },
    { id: 'alerts',   label: 'Price Alerts',    value: getAlertCountLabel(),                  arrow: '›',  action: showAlertsList },
    { id: 'import',   label: 'Import Wallet',   value: '',                                    arrow: '›',  action: () => navigateTo('import') },
    { id: 'about',    label: 'About',           value: `v${VERSION}`,                         arrow: '›',  action: showAbout },
  ];
}

// ── Render: main menu ──────────────────────────────────────────
function renderMenu() {
  const items = getMenuItems();
  const rows = items.map(item => `
    <li>
      <button class="setting-item focusable" tabindex="0" data-id="${item.id}">
        <span class="setting-label">${item.label}</span>
        <span class="setting-right">
          ${item.value ? `<span class="setting-value">${item.value}</span>` : ''}
          <span class="setting-arrow">${item.arrow}</span>
        </span>
      </button>
    </li>`).join('');

  _container.innerHTML = `
    <div class="settings-view" id="settings-main">
      <h2 class="settings-title">Settings</h2>
      <ul class="settings-list">${rows}</ul>
    </div>`;

  items.forEach(item => {
    _container.querySelector(`[data-id="${item.id}"]`)?.addEventListener('click', item.action);
  });

  const btns = _container.querySelectorAll('.setting-item');
  btns[Math.min(_menuFocusIdx, btns.length - 1)]?.focus();
}

// ── Render: RPC overlay ────────────────────────────────────────
function showRpc() {
  _mode = 'rpc';
  renderMenu();
  _container.querySelectorAll('.setting-item').forEach(b => b.setAttribute('aria-disabled', 'true'));

  const current = getRpcPreset();
  const opts = RPC_PRESETS.map(p => {
    const isActive = p.key === current;
    // helius/quicknode not fully configurable on-device
    const needsCompanion = p.key !== 'public';
    return `
      <button class="rpc-option focusable${isActive ? ' rpc-active' : ''}${needsCompanion ? ' rpc-needs-setup' : ''}"
              tabindex="0" data-key="${p.key}">
        <span class="rpc-option-label">${esc(p.label)}</span>
        <span class="rpc-option-right">
          ${needsCompanion ? `<span class="rpc-note">via companion</span>` : ''}
          ${isActive      ? `<span class="rpc-check">✓</span>` : ''}
        </span>
      </button>`;
  }).join('');

  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  overlay.innerHTML = `
    <div class="settings-submenu">
      <p class="submenu-title">RPC Endpoint</p>
      ${opts}
      <button class="submenu-action focusable" tabindex="0" id="rpc-cancel">Cancel</button>
    </div>`;

  RPC_PRESETS.forEach(p => {
    overlay.querySelector(`[data-key="${p.key}"]`)?.addEventListener('click', () => {
      setRpcPreset(p.key);
      _mode = 'menu';
    });
  });
  overlay.querySelector('#rpc-cancel').addEventListener('click', () => {
    _mode = 'menu'; renderMenu();
  });

  _container.querySelector('#settings-main').appendChild(overlay);
  overlay.querySelector('.focusable')?.focus();
}

// ── Render: about overlay ──────────────────────────────────────
function showAbout() {
  _mode = 'about';
  renderMenu();
  _container.querySelectorAll('.setting-item').forEach(b => b.setAttribute('aria-disabled', 'true'));

  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  overlay.innerHTML = `
    <div class="settings-submenu">
      <div class="about-icon">◈</div>
      <p class="about-name">SolVision</p>
      <p class="about-ver">v${VERSION}</p>
      <p class="about-desc">Solana wallet HUD for<br>Meta Ray-Ban Display</p>
      <button class="submenu-action focusable" tabindex="0" id="about-ok">OK</button>
    </div>`;

  overlay.querySelector('#about-ok').addEventListener('click', () => {
    _mode = 'menu'; renderMenu();
  });

  _container.querySelector('#settings-main').appendChild(overlay);
  overlay.querySelector('#about-ok').focus();
}

// ── Render: alerts list ────────────────────────────────────────
function showAlertsList() {
  _mode = 'alerts-list';
  _alertsWindowStart = 0;
  renderAlertsList();
}

function renderAlertsList() {
  const all    = get(STORAGE_KEYS.PRICE_ALERTS) || [];
  const active = all.filter(a => !a.triggered);
  const start  = _alertsWindowStart;
  const end    = Math.min(start + ALERTS_WINDOW, active.length);
  const slice  = active.slice(start, end);

  const rows = slice.map((a, i) => {
    const absIdx   = start + i;
    const dirColor = a.direction === 'above' ? 'var(--sol-cyan)' : 'var(--sol-hot)';
    const arrow    = a.direction === 'above' ? '▲' : '▼';
    return `
      <li class="alert-row" data-abs-idx="${absIdx}">
        <button class="alert-item-btn focusable" tabindex="0" aria-label="${esc(a.symbol)} alert">
          <span class="alert-left">
            <span class="alert-symbol">${esc(a.symbol)}</span>
            <span class="alert-dir" style="color:${dirColor}">${arrow}</span>
          </span>
          <span class="alert-threshold">${formatPrice(a.threshold)}</span>
        </button>
        <button class="alert-del focusable" tabindex="0" data-abs-idx="${absIdx}" title="Remove">✕</button>
      </li>`;
  }).join('');

  const scrollHint = active.length > ALERTS_WINDOW
    ? `<p class="alerts-scroll-hint">${start}–${end} of ${active.length}</p>` : '';

  _container.innerHTML = `
    <div class="settings-view">
      <div class="alerts-header">
        <button class="settings-back focusable" tabindex="0" id="alerts-back">← Settings</button>
        <h2 class="settings-title">Price Alerts</h2>
      </div>
      ${scrollHint}
      <ul class="settings-list" id="alerts-list">
        ${rows}
        <li>
          <button class="alert-new focusable" tabindex="0" id="alert-new">
            <span>+</span><span>New Alert</span>
          </button>
        </li>
      </ul>
      ${active.length === 0 ? '<p class="alerts-empty">No active alerts</p>' : ''}
    </div>`;

  _container.querySelector('#alerts-back').addEventListener('click', () => {
    _mode = 'menu'; _alertsWindowStart = 0; renderMenu();
  });

  _container.querySelector('#alert-new').addEventListener('click', () => {
    _alertDraft = { direction: 'above' };
    _tokenWindowStart = 0;
    _mode = 'alerts-token';
    renderAlertTokenPicker();
  });

  _container.querySelectorAll('.alert-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const absIdx  = parseInt(btn.dataset.absIdx, 10);
      const alerts  = get(STORAGE_KEYS.PRICE_ALERTS) || [];
      const actives = alerts.filter(a => !a.triggered);
      const target  = actives[absIdx];
      const newList = alerts.filter(a => a !== target);
      set(STORAGE_KEYS.PRICE_ALERTS, newList);
      if (_alertsWindowStart > 0 && _alertsWindowStart >= newList.filter(a => !a.triggered).length) {
        _alertsWindowStart = Math.max(0, _alertsWindowStart - 1);
      }
      renderAlertsList();
    });
  });

  // Custom arrow-key handler for virtual scrolling
  const listEl = _container.querySelector('#alerts-list');
  listEl.addEventListener('keydown', (e) => {
    const active2 = get(STORAGE_KEYS.PRICE_ALERTS) || [];
    const actives  = active2.filter(a => !a.triggered);
    const total    = actives.length + 1; // +1 for "New" button
    const focused  = document.activeElement;
    const absIdx   = parseInt(focused?.dataset?.absIdx ?? '-1', 10);

    if (e.key === 'ArrowDown' && !isNaN(absIdx)) {
      e.stopPropagation(); e.preventDefault();
      if (absIdx + 1 < actives.length) {
        if (absIdx + 1 >= _alertsWindowStart + ALERTS_WINDOW) {
          _alertsWindowStart++;
          renderAlertsList();
        }
        // re-query after re-render
        _container.querySelector(`[data-abs-idx="${absIdx + 1}"] .alert-item-btn`)?.focus();
      } else {
        _container.querySelector('#alert-new')?.focus();
      }
    } else if (e.key === 'ArrowUp' && !isNaN(absIdx)) {
      e.stopPropagation(); e.preventDefault();
      if (absIdx - 1 >= 0) {
        if (absIdx - 1 < _alertsWindowStart) {
          _alertsWindowStart = Math.max(0, _alertsWindowStart - 1);
          renderAlertsList();
        }
        _container.querySelector(`[data-abs-idx="${absIdx - 1}"] .alert-item-btn`)?.focus();
      } else {
        _container.querySelector('#alerts-back')?.focus();
      }
    }
  });

  const focusTarget = _container.querySelector('#alerts-list .focusable');
  focusTarget?.focus();
}

// ── Render: token picker ───────────────────────────────────────
function renderAlertTokenPicker() {
  const tokens = Object.entries(TOKEN_REGISTRY).map(([mint, meta]) => ({ mint, ...meta }));

  _container.innerHTML = `
    <div class="settings-view" id="token-picker-view">
      <div class="alerts-header">
        <button class="settings-back focusable" tabindex="0" id="token-back">← Alerts</button>
        <h2 class="settings-title">Select Token</h2>
      </div>
      <ul class="settings-list" id="token-list"></ul>
    </div>`;

  const listEl = _container.querySelector('#token-list');
  const nodes = tokens.map((t, i) => {
    const li  = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'setting-item';
    btn.tabIndex  = -1;
    btn.dataset.tokenIdx = String(i);
    btn.innerHTML = `
      <span class="setting-label" style="display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${esc(t.color)};flex-shrink:0"></span>
        <span>${esc(t.symbol)}</span>
      </span>
      <span class="setting-value" style="font-size:var(--text-xs)">${esc(t.name)}</span>`;
    btn.addEventListener('click', () => selectToken(t));
    li.appendChild(btn);
    listEl.appendChild(li);
    return btn;
  });

  function updateWindow() {
    const end = Math.min(_tokenWindowStart + TOKEN_WINDOW, tokens.length);
    nodes.forEach((btn, i) => {
      const visible = i >= _tokenWindowStart && i < end;
      btn.parentElement.style.display = visible ? '' : 'none';
      btn.tabIndex = visible ? 0 : -1;
      visible ? btn.classList.add('focusable') : btn.classList.remove('focusable');
    });
  }

  updateWindow();

  listEl.addEventListener('keydown', (e) => {
    const idx = parseInt(document.activeElement?.dataset?.tokenIdx ?? '-1', 10);
    if (isNaN(idx) || idx < 0) return;

    if (e.key === 'ArrowDown') {
      e.stopPropagation(); e.preventDefault();
      if (idx + 1 < tokens.length) {
        if (idx + 1 >= _tokenWindowStart + TOKEN_WINDOW) { _tokenWindowStart++; updateWindow(); }
        nodes[idx + 1].focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.stopPropagation(); e.preventDefault();
      if (idx > 0) {
        if (idx - 1 < _tokenWindowStart) { _tokenWindowStart--; updateWindow(); }
        nodes[idx - 1].focus();
      } else {
        _container.querySelector('#token-back')?.focus();
      }
    }
  });

  _container.querySelector('#token-back').addEventListener('click', () => {
    _alertsWindowStart = 0;
    _mode = 'alerts-list';
    renderAlertsList();
  });

  nodes[_tokenWindowStart]?.focus();
}

function selectToken(t) {
  const prices = getCachedPrices();
  const price  = prices[t.mint]?.price || 100;
  _alertDraft = {
    mint:      t.mint,
    symbol:    t.symbol,
    direction: 'above',
    threshold: price,
    _step:     calcStep(price),
  };
  _mode = 'alerts-config';
  renderAlertConfig();
}

// ── Render: configure alert ────────────────────────────────────
function calcStep(price) {
  if (price <= 0) return 1;
  return Math.pow(10, Math.floor(Math.log10(price)) - 1);
}

function fmtStep(step) {
  if (step < 0.001)  return `±${step.toFixed(6)}`;
  if (step < 1)      return `±${step.toFixed(3)}`;
  if (step < 1000)   return `±${step.toFixed(step % 1 === 0 ? 0 : 2)}`;
  return `±${step.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function renderAlertConfig() {
  const d        = _alertDraft;
  const dirUp    = d.direction === 'above';
  const dirLabel = dirUp ? 'ABOVE ▲' : 'BELOW ▼';
  const dirColor = dirUp ? 'var(--sol-cyan)' : 'var(--sol-hot)';

  _container.innerHTML = `
    <div class="settings-view">
      <div class="alerts-header">
        <button class="settings-back focusable" tabindex="0" id="config-back">← Token</button>
        <h2 class="settings-title">Set Alert</h2>
      </div>
      <div class="alert-config-body">
        <p class="alert-token-name">${esc(d.symbol)}</p>
        <p class="alert-config-label">Direction</p>
        <button class="alert-dir-toggle focusable" tabindex="0" id="dir-toggle"
                style="color:${dirColor};border-color:${dirColor}">${dirLabel}</button>
        <p class="alert-config-label">Threshold · ↑↓ adjust · ←→ step size</p>
        <button class="alert-stepper focusable" tabindex="0" id="threshold-stepper">
          <span class="stepper-value">${formatPrice(d.threshold)}</span>
          <span class="stepper-step">${fmtStep(d._step)}</span>
        </button>
        <div class="alert-actions">
          <button class="confirm-btn focusable" tabindex="0" id="alert-confirm">Set Alert</button>
          <button class="confirm-btn focusable" tabindex="0" id="alert-cancel">Cancel</button>
        </div>
      </div>
    </div>`;

  _container.querySelector('#config-back').addEventListener('click', () => {
    _tokenWindowStart = 0;
    _mode = 'alerts-token';
    renderAlertTokenPicker();
  });

  _container.querySelector('#dir-toggle').addEventListener('click', () => {
    d.direction = d.direction === 'above' ? 'below' : 'above';
    renderAlertConfig();
  });

  const stepper = _container.querySelector('#threshold-stepper');
  stepper.addEventListener('keydown', (e) => {
    if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
    e.stopPropagation(); e.preventDefault();

    if (e.key === 'ArrowUp')    d.threshold = Math.max(0, +(d.threshold + d._step).toPrecision(10) - 0);
    if (e.key === 'ArrowDown')  d.threshold = Math.max(0, +(d.threshold - d._step).toPrecision(10) - 0);
    if (e.key === 'ArrowLeft')  d._step = Math.max(1e-6, +(d._step / 10).toPrecision(6) - 0);
    if (e.key === 'ArrowRight') d._step = +(d._step * 10).toPrecision(6) - 0;

    stepper.querySelector('.stepper-value').textContent = formatPrice(d.threshold);
    stepper.querySelector('.stepper-step').textContent  = fmtStep(d._step);
  });

  _container.querySelector('#alert-confirm').addEventListener('click', () => {
    const alerts = get(STORAGE_KEYS.PRICE_ALERTS) || [];
    alerts.push({
      id:        Date.now(),
      mint:      d.mint,
      symbol:    d.symbol,
      direction: d.direction,
      threshold: d.threshold,
      triggered: false,
      createdAt: Date.now(),
    });
    set(STORAGE_KEYS.PRICE_ALERTS, alerts);
    pushNotification('◈', `Alert set: ${d.symbol} ${d.direction} ${formatPrice(d.threshold)}`);
    _alertsWindowStart = 0;
    _mode = 'alerts-list';
    renderAlertsList();
  });

  _container.querySelector('#alert-cancel').addEventListener('click', () => {
    _alertsWindowStart = 0;
    _mode = 'alerts-list';
    renderAlertsList();
  });

  _container.querySelector('#dir-toggle').focus();
}

// ── Router interface ───────────────────────────────────────────
function _render(container) {
  _container = container;
  _mode      = 'menu';
  renderMenu();
}

function _mount(container) {
  _container = container;
  _mode      = 'menu';
  _menuFocusIdx = 0;
  renderMenu();
}

function _unmount() {
  // Persist focus index so we restore it if re-entered
  const focused = _container?.querySelector('.setting-item:focus');
  if (focused) {
    const btns = Array.from(_container.querySelectorAll('.setting-item'));
    _menuFocusIdx = btns.indexOf(focused);
  }
}

export function register() {
  registerView('settings', { render: _render, mount: _mount, unmount: _unmount });
}
