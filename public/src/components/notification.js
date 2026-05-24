const DISMISS_MS = 4_000;

const _queue = [];
let _visible = false;

function _getContainer() {
  return document.getElementById('app-notifications');
}

function _iconFor(type) {
  if (type === 'swap')  return '⇄';
  if (type === 'token') return '◎';
  return '◈';
}

function _dismiss(el) {
  el.classList.remove('notif-visible');
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    el.remove();
    _visible = false;
    _showNext();
  }
  el.addEventListener('transitionend', finish, { once: true });
  setTimeout(finish, 400);
}

function _showNext() {
  if (_visible || _queue.length === 0) return;
  const { type, text } = _queue.shift();
  _visible = true;

  const c = _getContainer();
  if (!c) { _visible = false; return; }

  const el = document.createElement('div');
  el.className = 'notif-banner';
  el.innerHTML =
    `<span class="notif-icon">${_iconFor(type)}</span>` +
    `<span class="notif-text">${text}</span>` +
    `<span class="notif-time">just now</span>`;
  c.appendChild(el);

  requestAnimationFrame(() => el.classList.add('notif-visible'));

  const timer = setTimeout(() => _dismiss(el), DISMISS_MS);
  el._dismissTimer = timer;
}

export function pushNotification(type, text) {
  _queue.push({ type, text });
  _showNext();
}

export function initNotifications() {
  document.addEventListener('sv:transaction', (e) => {
    const { type } = e.detail;
    const label =
      type === 'swap'  ? 'Swap detected'  :
      type === 'token' ? 'Token transfer'  :
                         'SOL transfer';
    pushNotification(type, label);
  });
}
