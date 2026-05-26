export function renderStatusBar(container) {
  const el = document.createElement('div');
  el.className = 'status-bar';
  el.innerHTML = `
    <div class="nav-hints">
      <span class="hint-key">↑↓</span>
      <span>Navigate</span>
      <span class="hint-sep">·</span>
      <span class="hint-key">↵</span>
      <span>Select</span>
      <span class="hint-sep">·</span>
      <span class="hint-key">Esc</span>
      <span>Back</span>
    </div>
    <div class="tps-display">
      <span class="tps-label">TPS</span>
      <span class="tps-value">—</span>
    </div>
  `;

  container.appendChild(el);
  return el;
}

export function updateTPS(value) {
  const el = document.querySelector('.tps-value');
  if (!el) return;
  el.textContent = typeof value === 'number'
    ? value.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : '—';
}

export function setOfflineState(offline) {
  const display = document.querySelector('.tps-display');
  if (!display) return;
  if (offline) {
    display.innerHTML = '<span class="offline-label">Offline</span>';
  } else {
    display.innerHTML =
      '<span class="tps-label">TPS</span><span class="tps-value">—</span>';
  }
}
