import { renderHeader, updateNetworkStatus } from './components/header.js';
import { renderStatusBar } from './components/status-bar.js';

// ── App state ──────────────────────────────────────────────────
export const state = {
  currentView: null,
  navStack: [],       // max depth 2
  viewParams: {},
};

// ── View registry ──────────────────────────────────────────────
const registry = {};

/**
 * Register a view so the router can navigate to it.
 * render(container, params) — called once when view becomes active
 * mount(container, params)  — called after render; sets initial focus
 * unmount()                 — called before leaving the view
 */
export function registerView(name, { render, mount, unmount } = {}) {
  registry[name] = {
    render:  render  || (() => {}),
    mount:   mount   || (() => {}),
    unmount: unmount || (() => {}),
  };
}

// ── Router ─────────────────────────────────────────────────────
export function navigateTo(viewName, params = {}) {
  if (!registry[viewName]) return;

  const prev = state.currentView;
  if (prev) {
    registry[prev].unmount();
    document.getElementById(`view-${prev}`)?.classList.remove('active');
    if (state.navStack.length >= 2) state.navStack.shift();
    state.navStack.push(prev);
  }

  state.currentView = viewName;
  state.viewParams  = params;

  const container = document.getElementById(`view-${viewName}`);
  if (!container) return;

  container.classList.add('active');
  registry[viewName].render(container, params);
  registry[viewName].mount(container, params);
}

export function navigateBack() {
  if (state.navStack.length === 0) return;
  const prev = state.navStack.pop();

  const curr = state.currentView;
  if (curr) {
    registry[curr]?.unmount();
    document.getElementById(`view-${curr}`)?.classList.remove('active');
  }

  state.currentView = prev;
  const container = document.getElementById(`view-${prev}`);
  if (!container) return;

  container.classList.add('active');
  registry[prev]?.mount(container, {});
}

// ── D-pad input ────────────────────────────────────────────────
function moveFocus(forward) {
  const activeView = document.querySelector('.view.active');
  if (!activeView) return;

  const focusables = Array.from(
    activeView.querySelectorAll('.focusable:not([disabled]):not([aria-disabled="true"])')
  );
  if (focusables.length === 0) return;

  const idx = focusables.indexOf(document.activeElement);

  let next;
  if (forward) {
    next = idx < 0 ? focusables[0] : focusables[(idx + 1) % focusables.length];
  } else {
    next = idx <= 0
      ? focusables[focusables.length - 1]
      : focusables[idx - 1];
  }
  next?.focus();
}

document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      moveFocus(false);
      break;
    case 'ArrowDown':
      e.preventDefault();
      moveFocus(true);
      break;
    // ArrowLeft / ArrowRight are consumed here only if no component
    // handler already called e.stopPropagation() (e.g. char-selector).
    case 'ArrowLeft':
      e.preventDefault();
      moveFocus(false);
      break;
    case 'ArrowRight':
      e.preventDefault();
      moveFocus(true);
      break;
    case 'Enter':
      e.preventDefault();
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.click();
      }
      break;
    case 'Escape':
      e.preventDefault();
      navigateBack();
      break;
  }
});

// ── Stub view registrations (replaced by real views in Phase 2+) ──
function stubView(label, accent = 'var(--sol-text-dim)') {
  return {
    render(container) {
      container.innerHTML = `
        <div style="
          flex:1; display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:var(--space-3);
        ">
          <span style="font-size:var(--text-2xl); color:${accent};">◈</span>
          <span style="font-size:var(--text-lg); color:var(--sol-text-dim);">${label}</span>
        </div>
      `;
    },
    mount(container) {
      const first = container.querySelector('.focusable');
      first?.focus();
    },
  };
}

registerView('dashboard', stubView('Dashboard', 'var(--sol-cyan)'));
registerView('detail',    stubView('Token Detail'));
registerView('settings',  stubView('Settings',   'var(--sol-purple)'));
registerView('import',    stubView('Import Wallet', 'var(--sol-cyan)'));
registerView('manage',    stubView('Manage Wallets'));

// ── Boot ───────────────────────────────────────────────────────
function boot() {
  renderHeader(document.getElementById('app-header'));
  renderStatusBar(document.getElementById('app-status'));

  // Read persisted settings so updateNetworkStatus reflects reality
  const network = localStorage.getItem('sv_network') || 'mainnet-beta';
  updateNetworkStatus(network);

  const wallets = JSON.parse(localStorage.getItem('sv_wallets') || '[]');
  navigateTo(wallets.length > 0 ? 'dashboard' : 'import');
}

document.addEventListener('DOMContentLoaded', boot);
