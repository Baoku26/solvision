import { renderHeader, updateNetworkStatus } from './components/header.js';
import { renderStatusBar, setOfflineState } from './components/status-bar.js';
import { initNotifications }                from './components/notification.js';
import { isValidSolanaAddress }             from './utils/base58.js';
import { get, set }                         from './services/storage.js';
import { STORAGE_KEYS, WALLET_MAX }         from './constants.js';

import { register as registerDashboard } from './views/dashboard.js';
import { register as registerDetail    } from './views/detail.js';
import { register as registerImport    } from './views/import-wallet.js';
import { register as registerManage    } from './views/manage-wallets.js';
import { register as registerSettings  } from './views/settings.js';

// ── App state ──────────────────────────────────────────────────
export const state = {
  currentView: null,
  navStack: [],       // max depth 2
  viewParams: {},
};

// ── View registry ──────────────────────────────────────────────
const registry = {};

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
    next = idx <= 0 ? focusables[focusables.length - 1] : focusables[idx - 1];
  }
  next?.focus();
}

document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowUp':    e.preventDefault(); moveFocus(false); break;
    case 'ArrowDown':  e.preventDefault(); moveFocus(true);  break;
    // Components call e.stopPropagation() to intercept Left/Right (e.g. char-selector)
    case 'ArrowLeft':  e.preventDefault(); moveFocus(false); break;
    case 'ArrowRight': e.preventDefault(); moveFocus(true);  break;
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


registerDashboard();
registerDetail();
registerImport();
registerManage();
registerSettings();

// ── Deeplink detection ─────────────────────────────────────────
function consumeDeeplink() {
  const params = new URLSearchParams(window.location.search);
  const addr   = params.get('addr');
  if (!addr) return false;

  // Clear param immediately so refreshes don't reprocess it
  const clean = new URL(window.location.href);
  clean.searchParams.delete('addr');
  history.replaceState({}, '', clean.toString());

  if (!isValidSolanaAddress(addr)) return false;

  const wallets = get(STORAGE_KEYS.WALLETS) || [];
  if (wallets.some(w => w.address === addr)) return false; // already added
  if (wallets.length >= WALLET_MAX) return false;

  const label = `Wallet ${wallets.length + 1}`;
  wallets.push({ address: addr, label, addedAt: Date.now() });
  set(STORAGE_KEYS.WALLETS, wallets);
  if (wallets.length === 1) set(STORAGE_KEYS.ACTIVE_WALLET, 0);
  return true;
}

// ── Boot loader ────────────────────────────────────────────────
function hideBootLoader() {
  const el = document.getElementById('boot-loader');
  if (!el || el.style.display === 'none') return;
  el.classList.add('boot-out');
  el.addEventListener('transitionend', () => { el.style.display = 'none'; }, { once: true });
}

// ── Boot ───────────────────────────────────────────────────────
async function boot() {
  renderHeader(document.getElementById('app-header'));
  renderStatusBar(document.getElementById('app-status'));
  initNotifications();

  const network = localStorage.getItem(STORAGE_KEYS.NETWORK) || 'mainnet-beta';
  updateNetworkStatus(network);

  consumeDeeplink(); // may add a wallet from URL param

  const wallets = get(STORAGE_KEYS.WALLETS) || [];
  if (wallets.length === 0) {
    hideBootLoader();
    navigateTo('import');
    return;
  }

  navigateTo('dashboard');

  // Wait for first data load or 5s timeout, then reveal the app
  await Promise.race([
    new Promise(resolve =>
      document.addEventListener('sv:boot-complete', resolve, { once: true })
    ),
    new Promise(resolve => setTimeout(resolve, 5_000)),
  ]);
  hideBootLoader();
}

// ── Offline / online detection ──────────────────────────────────
window.addEventListener('offline', () => setOfflineState(true));
window.addEventListener('online',  () => setOfflineState(false));

document.addEventListener('DOMContentLoaded', boot);
