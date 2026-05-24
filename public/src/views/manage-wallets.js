import { get, set, remove } from '../services/storage.js';
import { truncateAddress }   from '../utils/format.js';
import { STORAGE_KEYS }      from '../constants.js';
import { registerView, navigateTo } from '../app.js';

// ── State ──────────────────────────────────────────────────────
let _container = null;
let _mode      = 'list';   // 'list' | 'submenu' | 'confirm'
let _focusIdx  = 0;
let _selectedIdx = null;

// ── Persistence helpers ────────────────────────────────────────
function getWallets()   { return get(STORAGE_KEYS.WALLETS)       || []; }
function getActiveIdx() { return get(STORAGE_KEYS.ACTIVE_WALLET) ?? 0; }

function setActiveWallet(idx) {
  set(STORAGE_KEYS.ACTIVE_WALLET, idx);
}

function removeWallet(idx) {
  const wallets = getWallets();
  wallets.splice(idx, 1);
  set(STORAGE_KEYS.WALLETS, wallets);

  let active = getActiveIdx();
  if (wallets.length === 0) {
    remove(STORAGE_KEYS.ACTIVE_WALLET);
  } else {
    if (active >= wallets.length) active = wallets.length - 1;
    if (active === idx) active = 0;
    set(STORAGE_KEYS.ACTIVE_WALLET, active);
  }
  return wallets.length;
}

function escText(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Render helpers ─────────────────────────────────────────────
function renderList() {
  const wallets   = getWallets();
  const activeIdx = getActiveIdx();

  const items = wallets.map((w, i) => `
    <li>
      <button class="wallet-item focusable" tabindex="0" data-idx="${i}"
              ${_mode !== 'list' ? 'aria-disabled="true"' : ''}>
        <span class="wallet-info">
          <span class="wallet-label">${escText(w.label)}</span>
          <span class="wallet-addr">${truncateAddress(w.address)}</span>
        </span>
        ${i === activeIdx ? '<span class="wallet-badge">Active</span>' : ''}
      </button>
    </li>`).join('');

  _container.innerHTML = `
    <div class="manage-view">
      <h2 class="manage-title">Manage Wallets</h2>
      <ul class="wallet-list">
        ${items}
        <li>
          <button class="wallet-add focusable" tabindex="0" id="add-wallet"
                  ${_mode !== 'list' ? 'aria-disabled="true"' : ''}>
            <span>+</span><span>Add Wallet</span>
          </button>
        </li>
      </ul>
    </div>`;

  _container.querySelectorAll('.wallet-item').forEach(btn => {
    btn.addEventListener('click', () => {
      _selectedIdx = parseInt(btn.dataset.idx, 10);
      _focusIdx    = _selectedIdx;
      _mode        = 'submenu';
      renderOverlay();
    });
  });

  _container.querySelector('#add-wallet')?.addEventListener('click', () => {
    navigateTo('import');
  });

  // Restore focus
  const all = _container.querySelectorAll('.wallet-item, #add-wallet');
  all[Math.min(_focusIdx, all.length - 1)]?.focus();
}

function renderOverlay() {
  // Re-render list with aria-disabled, then append overlay
  renderList();

  const wallets = getWallets();
  const w = wallets[_selectedIdx];
  if (!w) return;

  const overlay = document.createElement('div');
  overlay.className = 'manage-overlay';

  if (_mode === 'submenu') {
    overlay.innerHTML = `
      <div class="manage-submenu">
        <p class="submenu-title">${escText(w.label)} · ${truncateAddress(w.address)}</p>
        <button class="submenu-action focusable" tabindex="0" id="action-active">Set Active</button>
        <button class="submenu-action danger focusable" tabindex="0" id="action-remove">Remove</button>
        <button class="submenu-action focusable" tabindex="0" id="action-cancel">Cancel</button>
      </div>`;

    overlay.querySelector('#action-active').addEventListener('click', () => {
      setActiveWallet(_selectedIdx);
      _mode = 'list';
      renderList();
    });
    overlay.querySelector('#action-remove').addEventListener('click', () => {
      _mode = 'confirm';
      renderOverlay();
    });
    overlay.querySelector('#action-cancel').addEventListener('click', () => {
      _mode = 'list';
      renderList();
    });

    _container.querySelector('.manage-view').appendChild(overlay);
    overlay.querySelector('#action-active').focus();

  } else if (_mode === 'confirm') {
    overlay.innerHTML = `
      <div class="manage-submenu">
        <p class="confirm-text">Remove <strong>${escText(w.label)}</strong>?</p>
        <div class="confirm-actions">
          <button class="confirm-btn danger focusable" tabindex="0" id="confirm-yes">Remove</button>
          <button class="confirm-btn focusable" tabindex="0" id="confirm-no">Cancel</button>
        </div>
      </div>`;

    overlay.querySelector('#confirm-yes').addEventListener('click', () => {
      const remaining = removeWallet(_selectedIdx);
      if (remaining === 0) {
        navigateTo('import');
      } else {
        _focusIdx = Math.max(0, _selectedIdx - 1);
        _mode = 'list';
        renderList();
      }
    });
    overlay.querySelector('#confirm-no').addEventListener('click', () => {
      _mode = 'list';
      renderList();
    });

    _container.querySelector('.manage-view').appendChild(overlay);
    overlay.querySelector('#confirm-no').focus();
  }
}

// ── Router interface ───────────────────────────────────────────
function render(container) {
  _container = container;
  renderList();
}

function mount(container) {
  _mode     = 'list';
  _focusIdx = 0;
  render(container);
}

function unmount() {
  _mode        = 'list';
  _selectedIdx = null;
}

export function register() {
  registerView('manage', { render, mount, unmount });
}
