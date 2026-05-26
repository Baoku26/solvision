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
      <span class="header-clock"></span>
    </div>
  `;

  container.appendChild(el);

  _startClock(el.querySelector('.header-clock'));

  return el;
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
