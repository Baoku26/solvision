import { get }                        from './storage.js';
import { STORAGE_KEYS, RPC_ENDPOINTS } from '../constants.js';

const BACKOFF_INITIAL = 1_000;
const BACKOFF_MAX     = 30_000;

// ── Internal factory ───────────────────────────────────────────
function createWebSocketMonitor() {
  let ws              = null;
  let walletAddr      = null;
  let reconnectTimer  = null;
  let reconnectDelay  = BACKOFF_INITIAL;
  let stopped         = false;

  // Map of reqId → callback(subscriptionId)
  const pendingReqs   = {};
  let reqId           = 0;

  function nextId() { return ++reqId; }

  // ── WS URL derivation ────────────────────────────────────────
  function getWsUrl() {
    const http = get(STORAGE_KEYS.RPC_ENDPOINT) || RPC_ENDPOINTS.MAINNET_PUBLIC;
    return http.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
  }

  // ── Send helpers ─────────────────────────────────────────────
  function send(msg) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  function sendSubscription(method, params, onSubId) {
    const id = nextId();
    pendingReqs[id] = onSubId;
    send({ jsonrpc: '2.0', id, method, params });
  }

  // ── Subscribe after connect ──────────────────────────────────
  function subscribeAll() {
    if (!walletAddr) return;

    sendSubscription(
      'accountSubscribe',
      [walletAddr, { encoding: 'jsonParsed', commitment: 'confirmed' }],
      () => {} // subId stored only if unsubscribe is needed later
    );

    sendSubscription(
      'logsSubscribe',
      [{ mentions: [walletAddr] }, { commitment: 'confirmed' }],
      () => {}
    );
  }

  // ── Message parsing ──────────────────────────────────────────
  function parseTransactionType(logs) {
    const combined = (logs.logs ?? []).join(' ');
    if (combined.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')) {
      return combined.includes('Swap') ? 'swap' : 'token';
    }
    return 'sol';
  }

  function onMessage(event) {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    // Subscription confirmation
    if (msg.id != null && msg.result !== undefined) {
      pendingReqs[msg.id]?.(msg.result);
      delete pendingReqs[msg.id];
      return;
    }

    if (!msg.method) return;

    if (msg.method === 'accountNotification') {
      const value = msg.params?.result?.value;
      if (value?.lamports !== undefined) {
        document.dispatchEvent(new CustomEvent('sv:balance-changed', {
          detail: { lamports: value.lamports },
          bubbles: false,
        }));
      }
    }

    if (msg.method === 'logsNotification') {
      const logs = msg.params?.result?.value;
      if (!logs) return;
      const type = parseTransactionType(logs);
      document.dispatchEvent(new CustomEvent('sv:transaction', {
        detail: { type, signature: logs.signature, err: logs.err },
        bubbles: false,
      }));
    }
  }

  // ── Connection lifecycle ─────────────────────────────────────
  function connect(address) {
    if (!address) return;
    walletAddr = address;
    stopped    = false;
    _openSocket();
  }

  function _openSocket() {
    if (ws) {
      ws.onclose = null; // prevent reconnect from old socket
      ws.close();
    }

    const url = getWsUrl();
    ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectDelay = BACKOFF_INITIAL; // reset on successful connect
      subscribeAll();
    };

    ws.onmessage = onMessage;

    ws.onerror = () => {
      // onerror is always followed by onclose; do nothing here
    };

    ws.onclose = () => {
      ws = null;
      if (!stopped) scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!stopped && walletAddr) _openSocket();
    }, reconnectDelay);

    // Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s max
    reconnectDelay = Math.min(reconnectDelay * 2, BACKOFF_MAX);
  }

  function disconnect() {
    stopped    = true;
    walletAddr = null;
    reconnectDelay = BACKOFF_INITIAL;

    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
  }

  return { connect, disconnect };
}

// ── Singleton exported for use across the app ──────────────────
export const wsMonitor = createWebSocketMonitor();
