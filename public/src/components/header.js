let _clockInterval = null;

export function renderHeader(container) {
  const el = document.createElement('div');
  el.className = 'app-header';
  el.innerHTML = `
    <div class="header-brand">
      <span class="brand-icon">◈</span>
      <span class="brand-name">SolVision</span>
    </div>
    <div class="header-right">
      <div class="network-indicator">
        <span class="network-dot"></span>
        <span class="network-label">Mainnet</span>
      </div>
      <span class="header-clock"></span>
    </div>
  `;

  container.appendChild(el);

  _startClock(el.querySelector('.header-clock'));

  return el;
}

export function updateNetworkStatus(network) {
  const dot   = document.querySelector('.network-dot');
  const label = document.querySelector('.network-label');
  if (!dot || !label) return;

  if (network === 'devnet') {
    dot.classList.add('devnet');
    label.textContent = 'Devnet';
  } else {
    dot.classList.remove('devnet');
    label.textContent = 'Mainnet';
  }
}

function _startClock(el) {
  if (_clockInterval) clearInterval(_clockInterval);

  function tick() {
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2, '0');
    const mm  = String(now.getMinutes()).padStart(2, '0');
    el.textContent = `${hh}:${mm}`;
  }

  tick();
  _clockInterval = setInterval(tick, 10_000);
}
