import { formatPrice, formatCompact } from '../utils/format.js';

function _fmtChange(pct) {
  if (pct === null || pct === undefined) return '—';
  return (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(2) + '%';
}

function _changeClass(pct) {
  if (pct === null || pct === undefined) return 'ti-change dim';
  return pct >= 0 ? 'ti-change up' : 'ti-change down';
}

function _fmtHoldings(balance, symbol, price) {
  if (!balance) return `0 ${symbol}`;
  const usd = balance * (price || 0);
  const bal = balance >= 1000
    ? balance.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : balance < 0.0001 ? balance.toFixed(6)
    : balance < 1 ? balance.toFixed(4)
    : balance.toFixed(2);
  return usd > 0
    ? `${bal} ${symbol} · $${formatCompact(usd)}`
    : `${bal} ${symbol}`;
}

function _fill(el, d) {
  const chg     = d.change24h ?? null;
  const initial = (d.symbol || '?').charAt(0).toUpperCase();
  const logoUrl = d.logoURI || '';
  const color   = d.color || '#444';

  el.innerHTML =
    `<div class="ti-icon" style="background:linear-gradient(135deg,${color}cc,${color}55)">` +
      `<span class="ti-icon-letter">${initial}</span>` +
      (logoUrl ? `<img class="ti-icon-img" src="${logoUrl}" alt="" aria-hidden="true" onerror="this.style.display='none'">` : '') +
    `</div>` +
    `<div class="ti-body">` +
      `<span class="ti-symbol">${d.symbol || '???'}</span>` +
      `<span class="ti-sub">${_fmtHoldings(d.balance || 0, d.symbol || '???', d.price || 0)}</span>` +
    `</div>` +
    `<div class="ti-right">` +
      `<span class="ti-price">${formatPrice(d.price || 0)}</span>` +
      `<span class="${_changeClass(chg)}">${_fmtChange(chg)}</span>` +
    `</div>`;
}

export function createTokenItem(data) {
  const el = document.createElement('div');
  el.className  = 'token-item focusable';
  el.tabIndex   = 0;
  el.dataset.mint = data.mint;
  _fill(el, data);
  return el;
}

export function updateTokenItem(el, data) {
  _fill(el, data);
}
