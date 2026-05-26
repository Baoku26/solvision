import { formatPrice, formatHoldings } from '../utils/format.js';

function _fmtChange(pct) {
  if (pct === null || pct === undefined) return '—';
  return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
}

function _changeColor(pct) {
  if (pct === null || pct === undefined) return 'var(--sol-text-dim)';
  return pct >= 0 ? 'var(--sol-cyan)' : 'var(--sol-hot)';
}

function _fill(el, d) {
  const usdValue = (d.balance || 0) * (d.price || 0);
  const chg      = d.change24h ?? null;
  const initial  = (d.symbol || '?').charAt(0).toUpperCase();
  const logoUrl  = `https://img.jup.ag/tokens/${d.mint}`;

  el.innerHTML =
    `<div class="ti-icon" style="background:${d.color || '#444'}">` +
      `<span class="ti-icon-letter">${initial}</span>` +
      `<img class="ti-icon-img" src="${logoUrl}" alt="" aria-hidden="true" onerror="this.style.display='none'">` +
    `</div>` +
    `<div class="ti-body">` +
      `<div class="ti-top">` +
        `<span class="ti-symbol">${d.symbol || '???'}</span>` +
        `<span class="ti-price">${formatPrice(d.price || 0)}</span>` +
      `</div>` +
      `<div class="ti-bottom">` +
        `<span class="ti-name">${d.name || ''}</span>` +
        `<span class="ti-change" style="color:${_changeColor(chg)}">${_fmtChange(chg)}</span>` +
      `</div>` +
    `</div>` +
    `<div class="ti-right">` +
      `<span class="ti-value">${formatPrice(usdValue)}</span>` +
      `<span class="ti-holdings">${formatHoldings(d.balance || 0, d.symbol || '???')}</span>` +
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
