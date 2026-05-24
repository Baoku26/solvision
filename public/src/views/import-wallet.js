import { createCharSelector } from '../components/char-selector.js';
import { getPairingAddress }   from '../services/pairing.js';
import { isValidSolanaAddress } from '../utils/base58.js';
import { get, set }            from '../services/storage.js';
import { CHARSETS, WALLET_MAX, STORAGE_KEYS } from '../constants.js';
import { registerView, navigateTo } from '../app.js';

// ── Wallet persistence ─────────────────────────────────────────
function saveWallet(address) {
  const wallets = get(STORAGE_KEYS.WALLETS) || [];
  if (wallets.some(w => w.address === address)) throw new Error('Already connected');
  if (wallets.length >= WALLET_MAX) throw new Error(`Wallet limit reached (max ${WALLET_MAX})`);
  const label = `Wallet ${wallets.length + 1}`;
  wallets.push({ address, label, addedAt: Date.now() });
  set(STORAGE_KEYS.WALLETS, wallets);
  if (wallets.length === 1) set(STORAGE_KEYS.ACTIVE_WALLET, 0);
}

function escText(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── View state ─────────────────────────────────────────────────
let _container = null;
let _mode = 'menu'; // 'menu' | 'pairing' | 'manual' | 'deeplink' | 'loading' | 'error'
let _errorMsg = '';

function setMode(mode, error = '') {
  _mode = mode;
  _errorMsg = error;
  render(_container, {});
}

// ── Render helpers ─────────────────────────────────────────────
function renderMenu() {
  _container.innerHTML = `
    <div class="import-view">
      <div class="import-header">
        <h2 class="import-title">Import Wallet</h2>
        <p class="import-sub">Connect your Solana wallet</p>
      </div>
      <ul class="import-menu">
        <li>
          <button class="import-option focusable" tabindex="0" id="opt-pair">
            <span class="opt-icon">◈</span>
            <span class="opt-text">
              <span class="opt-label">Enter Pairing Code</span>
              <span class="opt-desc">6-char code from solvision.app/setup</span>
            </span>
          </button>
        </li>
        <li>
          <button class="import-option focusable" tabindex="0" id="opt-link">
            <span class="opt-icon">⊹</span>
            <span class="opt-text">
              <span class="opt-label">Paste via Link</span>
              <span class="opt-desc">Open solvision.app/setup on your phone</span>
            </span>
          </button>
        </li>
        <li>
          <button class="import-option focusable" tabindex="0" id="opt-manual">
            <span class="opt-icon text-dim">⌨</span>
            <span class="opt-text">
              <span class="opt-label">Enter Address Manually</span>
              <span class="opt-desc">44-character Base58 address</span>
            </span>
          </button>
        </li>
      </ul>
    </div>`;

  _container.querySelector('#opt-pair')  .addEventListener('click', () => setMode('pairing'));
  _container.querySelector('#opt-link')  .addEventListener('click', () => setMode('deeplink'));
  _container.querySelector('#opt-manual').addEventListener('click', () => setMode('manual'));

  _container.querySelector('#opt-pair').focus();
}

function renderCharEntry({ mode }) {
  const isPairing = mode === 'pairing';
  const charset = isPairing ? CHARSETS.ALPHANUMERIC : CHARSETS.BASE58;
  const slots   = isPairing ? 6 : 44;
  const hint    = isPairing
    ? 'Enter the 6-character code shown on your companion device'
    : 'Enter your 44-character Solana address';

  _container.innerHTML = `
    <div class="import-view">
      <div class="import-header">
        <h2 class="import-title">${isPairing ? 'Pairing Code' : 'Manual Address'}</h2>
        <p class="import-sub">${hint}</p>
      </div>
      <div id="cs-host"></div>
      <button class="import-back focusable" tabindex="0" id="back-btn">← Back</button>
    </div>`;

  _container.querySelector('#back-btn').addEventListener('click', () => setMode('menu'));

  createCharSelector(
    _container.querySelector('#cs-host'),
    {
      charset,
      slots,
      onComplete: (value) => handleComplete(value, mode),
    }
  );
}

async function handleComplete(value, mode) {
  if (mode === 'pairing') {
    setMode('loading');
    try {
      const address = await getPairingAddress(value.toUpperCase());
      if (!isValidSolanaAddress(address)) throw new Error('Invalid address received');
      saveWallet(address);
      navigateTo('dashboard');
    } catch (err) {
      setMode('error', err.message);
    }
  } else {
    // manual
    if (!isValidSolanaAddress(value)) {
      setMode('error', 'Invalid Solana address');
      return;
    }
    try {
      saveWallet(value);
      navigateTo('dashboard');
    } catch (err) {
      setMode('error', err.message);
    }
  }
}

function renderLoading() {
  _container.innerHTML = `
    <div class="import-view import-centered">
      <span class="import-spinner"></span>
      <p class="import-title">Connecting…</p>
    </div>`;
}

function renderError() {
  _container.innerHTML = `
    <div class="import-view import-centered">
      <span class="import-err-icon">✕</span>
      <p class="import-title text-hot">${escText(_errorMsg)}</p>
      <button class="import-back focusable" tabindex="0" id="retry-btn">← Try again</button>
    </div>`;
  _container.querySelector('#retry-btn').addEventListener('click', () => setMode('menu'));
  _container.querySelector('#retry-btn').focus();
}

function renderDeeplink() {
  _container.innerHTML = `
    <div class="import-view">
      <div class="import-header">
        <h2 class="import-title">Paste via Link</h2>
      </div>
      <p class="import-instructions">
        On your phone or computer, visit:<br>
        <span class="import-url">solvision.app/setup</span>
      </p>
      <p class="import-instructions text-dim">
        Paste your wallet address there. The app will
        automatically detect it when you return here.
      </p>
      <button class="import-back focusable" tabindex="0" id="back-btn">← Back</button>
    </div>`;
  _container.querySelector('#back-btn').addEventListener('click', () => setMode('menu'));
  _container.querySelector('#back-btn').focus();
}

// ── Main render dispatch ───────────────────────────────────────
function render(container, params) {
  _container = container;
  switch (_mode) {
    case 'menu':     return renderMenu();
    case 'pairing':  return renderCharEntry({ mode: 'pairing' });
    case 'manual':   return renderCharEntry({ mode: 'manual' });
    case 'loading':  return renderLoading();
    case 'error':    return renderError();
    case 'deeplink': return renderDeeplink();
  }
}

function mount(container) {
  _mode = 'menu';
  render(container, {});
}

function unmount() {
  _mode = 'menu';
  _errorMsg = '';
}

export function register() {
  registerView('import', { render, mount, unmount });
}
