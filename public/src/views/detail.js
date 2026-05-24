import { registerView, navigateBack }       from '../app.js';
import { createSparkline }                  from '../components/sparkline.js';
import { getPriceHistory }                  from '../services/prices.js';
import { formatPrice, formatHoldings }      from '../utils/format.js';

function _fmtChange(pct) {
  if (pct === null || pct === undefined) return '—';
  return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
}

function _changeColor(pct) {
  if (pct === null || pct === undefined) return 'var(--sol-text-dim)';
  return pct >= 0 ? 'var(--sol-cyan)' : 'var(--sol-hot)';
}

function _updateStats(container, price, balance, symbol, history) {
  const usd = (balance || 0) * (price || 0);
  if (history.length > 0) {
    const vals = history.map(p => p.p);
    container.querySelector('.stat-high').textContent = formatPrice(Math.max(...vals));
    container.querySelector('.stat-low').textContent  = formatPrice(Math.min(...vals));
  }
  container.querySelector('.stat-holdings').textContent = formatHoldings(balance || 0, symbol || '???');
  container.querySelector('.stat-usd').textContent      = formatPrice(usd);
}

// ── Module state ───────────────────────────────────────────────
let _sparkline    = null;
let _currentToken = null;
let _priceHandler = null;

// ── View lifecycle ─────────────────────────────────────────────
function _render(container, params) {
  _currentToken = params.token || {};
  const t = _currentToken;

  container.innerHTML =
    `<div class="detail-view">` +
      `<div class="detail-header">` +
        `<button class="detail-back focusable" tabindex="0">← Back</button>` +
        `<span class="detail-title">${t.symbol || '???'} · ${t.name || ''}</span>` +
      `</div>` +
      `<div class="detail-price-block">` +
        `<div class="detail-price">${formatPrice(t.price || 0)}</div>` +
        `<div class="detail-change" style="color:${_changeColor(t.change24h)}">${_fmtChange(t.change24h)}</div>` +
      `</div>` +
      `<div class="detail-sparkline-area"></div>` +
      `<div class="detail-stats">` +
        `<div class="stat-item">` +
          `<span class="stat-label">24h High</span>` +
          `<span class="stat-value stat-high">—</span>` +
        `</div>` +
        `<div class="stat-item">` +
          `<span class="stat-label">24h Low</span>` +
          `<span class="stat-value stat-low">—</span>` +
        `</div>` +
        `<div class="stat-item">` +
          `<span class="stat-label">Holdings</span>` +
          `<span class="stat-value stat-holdings">—</span>` +
        `</div>` +
        `<div class="stat-item">` +
          `<span class="stat-label">Value</span>` +
          `<span class="stat-value stat-usd">—</span>` +
        `</div>` +
      `</div>` +
    `</div>`;

  container.querySelector('.detail-back').addEventListener('click', () => navigateBack());
}

function _mount(container, params) {
  if (params.token) _currentToken = params.token;
  const t = _currentToken || {};

  // Sparkline
  if (_sparkline) { _sparkline.destroy(); _sparkline = null; }
  const sparkArea = container.querySelector('.detail-sparkline-area');
  const sparkW    = sparkArea.clientWidth || 568;
  _sparkline = createSparkline(sparkArea, { width: sparkW, height: 80 });

  const history = getPriceHistory(t.mint || '');
  _sparkline.update(history);
  _updateStats(container, t.price, t.balance, t.symbol, history);

  // Subscribe to price updates dispatched by dashboard
  _priceHandler = (e) => {
    const prices = e.detail.prices;
    const mint   = _currentToken?.mint;
    if (!mint || !prices[mint]) return;

    const updated = prices[mint];
    _currentToken = { ..._currentToken, ...updated };

    const priceEl  = container.querySelector('.detail-price');
    const changeEl = container.querySelector('.detail-change');
    if (priceEl)  priceEl.textContent    = formatPrice(updated.price);
    if (changeEl) {
      changeEl.textContent = _fmtChange(updated.change24h);
      changeEl.style.color = _changeColor(updated.change24h);
    }

    const newHistory = getPriceHistory(mint);
    _sparkline?.update(newHistory);
    _updateStats(container, updated.price, _currentToken.balance, _currentToken.symbol, newHistory);
  };
  document.addEventListener('sv:prices-updated', _priceHandler);

  setTimeout(() => container.querySelector('.detail-back')?.focus(), 50);
}

function _unmount() {
  if (_priceHandler) {
    document.removeEventListener('sv:prices-updated', _priceHandler);
    _priceHandler = null;
  }
  if (_sparkline) {
    _sparkline.destroy();
    _sparkline = null;
  }
}

export function register() {
  registerView('detail', {
    render:  _render,
    mount:   _mount,
    unmount: _unmount,
  });
}
