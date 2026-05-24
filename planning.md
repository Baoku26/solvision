# SolVision — Planning & Architecture

## Vision

Build the first Solana wallet HUD for Meta Ray-Ban Display glasses. Users glance and instantly see their portfolio value, token prices, and transaction activity — floating transparently over the real world, navigated entirely by hand gestures.

---

## Architecture Decisions

### AD-1: No Build Step / No Framework

**Decision:** Ship vanilla HTML/CSS/JS with ES modules. No React, no bundler, no transpiler.

**Rationale:**
- MRBD web app runtime is a constrained browser. Every KB matters — target is <80KB gzipped total.
- No build step means instant iteration: edit, save, reload on glasses.
- The app has ~6 views and ~8 components. A framework adds overhead without proportional benefit at this scale.
- Meta's own docs recommend "AI-assisted coding" with plain HTML/CSS/JS as the primary path.

**Trade-off:** No component reactivity system. State changes require manual DOM updates. Accepted because the UI is simple enough that a lightweight render-on-change pattern (rewrite innerHTML or toggle classes) is sufficient.

### AD-2: Companion-Based Wallet Import

**Decision:** Wallet addresses are imported via a companion web page (phone/desktop), not entered directly on the glasses.

**Rationale:**
- MRBD has no text input capability — no on-screen keyboard, no voice-to-text for web apps.
- Camera is not available to web apps, so QR scanning on-device is impossible.
- A 6-character pairing code bridges the companion device to the glasses with minimal arrow-key input.
- Deeplink import (URL with `?addr=` query param) is even more frictionless when the companion device is the paired phone.

**Trade-off:** Requires a small server component (pairing API). Accepted — Vercel Edge Functions are free-tier and the endpoint is trivial (create code, retrieve by code, delete after use).

### AD-3: View-Only Wallet (No Signing)

**Decision:** SolVision v1.0 is strictly view-only. No private keys, no seed phrases, no transaction signing.

**Rationale:**
- Security: the glasses lack biometric auth, PIN input, or any secure enclave. Storing private keys in localStorage would be irresponsible.
- Scope: a HUD is for monitoring, not transacting. Users have Phantom/Solflare on their phones for that.
- Future: v2.0 may support signing via Neural Band gesture authentication if Meta ships the APIs.

**Trade-off:** Users cannot initiate swaps or transfers from the glasses. Accepted for v1.0.

### AD-4: Jupiter Price API v2 as Primary Price Source

**Decision:** Use Jupiter's batch price endpoint for all token prices.

**Rationale:**
- Free, no API key required for basic usage.
- Solana-native: covers all SPL tokens including memecoins.
- Batch endpoint: one request returns prices for all tracked tokens, minimizing network calls.
- Sub-second response times from Jupiter's infrastructure.

**Fallback:** CoinGecko free API (rate-limited, 10-30 req/min). Triggered if Jupiter returns errors 3 times consecutively.

### AD-5: Helius as Default RPC Provider

**Decision:** Default to Helius free-tier RPC (50 req/s) instead of public Solana RPC.

**Rationale:**
- Public RPC is heavily rate-limited and unreliable for polling at 10s intervals.
- Helius free tier provides sufficient throughput for a single-user HUD app.
- Helius also provides enhanced API endpoints (DAS, token metadata) that may be useful in v1.1.

**Configuration:** Users can switch to QuickNode, custom RPC, or public in Settings. The RPC URL is stored in localStorage.

### AD-6: WebSocket for Transaction Monitoring

**Decision:** Use Solana WebSocket subscriptions for real-time transaction notifications instead of polling.

**Rationale:**
- Polling `getSignaturesForAddress` at high frequency wastes RPC quota.
- WebSocket `accountSubscribe` fires immediately when the wallet's SOL balance changes.
- `logsSubscribe` with `mentions` filter catches SPL token transfers.
- Event-driven: notification banner fires only when something happens, not on a timer.

**Trade-off:** WebSocket connections may drop on unstable mobile networks (the glasses rely on the paired phone's connection). Implement reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s).

---

## Data Architecture

### State Shape

```
AppState {
  // Wallet
  wallets: [{ address, label, addedAt }]   // max 5, persisted in localStorage
  activeWalletIndex: number                 // persisted
  
  // Portfolio
  solBalance: number                        // lamports → SOL
  tokenAccounts: [{                         // from getTokenAccountsByOwner
    mint: string,
    balance: number,
    decimals: number,
    symbol: string,
    name: string,
    logoURI: string
  }]
  
  // Prices
  prices: { [mint]: { price, change24h } }  // from Jupiter
  priceHistory: { [mint]: number[] }         // last 24h, max 30 points per token
  lastPriceUpdate: timestamp
  
  // Network
  tps: number
  rpcEndpoint: string                       // persisted
  network: 'mainnet-beta' | 'devnet'        // persisted
  
  // UI
  currentView: 'dashboard' | 'detail' | 'settings' | 'import' | 'manage'
  selectedTokenIndex: number
  focusIndex: number
  notificationQueue: [{ icon, text, timestamp }]
  
  // Settings
  refreshInterval: 5000 | 10000 | 30000 | 60000  // persisted
  currency: 'USD' | 'EUR' | 'GBP' | 'NGN'        // persisted
  tokenFilter: 'all' | 'nonzero'                   // persisted
}
```

### localStorage Keys

```
sv_wallets          → JSON array of wallet objects
sv_active_wallet    → index (number)
sv_rpc_endpoint     → URL string
sv_network          → 'mainnet-beta' | 'devnet'
sv_refresh_interval → milliseconds (number)
sv_currency         → currency code
sv_token_filter     → 'all' | 'nonzero'
sv_price_cache      → JSON { prices, timestamp }
sv_price_alerts     → JSON array of alert objects
sv_debug            → 'true' | absent
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/pair` | Create | Body: `{ address }` → Returns `{ code }` |
| `GET /api/pair/:code` | Read | Returns `{ address }` or 404 |
| `DELETE /api/pair/:code` | Cleanup | Called after successful import |
| `GET /api/health` | Health | Returns `{ ok: true, timestamp }` |

---

## Network Strategy

### Request Budget (per minute, default 10s price refresh)

| Source | Requests/min | Notes |
|--------|-------------|-------|
| Jupiter Price API | 6 | Batch endpoint, 1 call per tick |
| Solana RPC (balance) | 2 | Every 30s |
| Solana RPC (token accounts) | 2 | Every 30s |
| Solana RPC (TPS) | 4 | Every 15s |
| Solana WebSocket | 1 (persistent) | Reconnect only on drop |
| **Total RPC** | **~8/min** | Well within Helius free tier |

### Offline / Degraded Behavior

| Scenario | Behavior |
|----------|----------|
| RPC unreachable | Show last cached balances with "Stale" indicator; retry every 30s |
| Price API unreachable | Show last cached prices with timestamp of last update |
| WebSocket dropped | Reconnect with exponential backoff; fall back to polling getSignatures every 30s |
| Complete offline | Show full cached state with "Offline" banner; suppress all polling |
| localStorage cleared | Show "No wallet configured" → redirect to import flow |

---

## Rendering Strategy

### Virtual List (Token List)

The dashboard shows up to 8 tokens but only 6 fit in the viewport between the header, balance section, and status bar. Implementation:

1. Render all token items in the DOM but only the visible window (6 items) gets `display: flex`.
2. Track `viewportStart` index. When focus moves past the visible range, shift `viewportStart` and toggle display on items entering/leaving the window.
3. This avoids creating/destroying DOM nodes on every navigation, which keeps re-renders fast.

### Sparkline Canvas

- Render on a `<canvas>` element at 2x device pixel ratio for sharp lines.
- Gradient fill from line color (green/red) at top to transparent at bottom.
- Pulsing end-dot marks the current price point.
- Redraw on every price tick (~3s). Use `requestAnimationFrame` for smooth updates.

---

## Security Model

| Concern | Mitigation |
|---------|------------|
| Private key exposure | Never stored. App is view-only. No signing APIs. |
| Pairing code brute force | Codes are 6-char alphanumeric (2.1B combinations). Rate limit: 5 attempts per IP per minute. TTL: 10 minutes. |
| Man-in-the-middle on pairing | HTTPS only (TLS 1.3). Pairing codes are single-use and deleted immediately after retrieval. |
| localStorage tampering | Validate wallet addresses on every boot (Base58, length check). Invalid data → clear and redirect to import. |
| XSS via token metadata | All token names/symbols are escaped before DOM insertion. Never use `innerHTML` with untrusted data — use `textContent`. |
| RPC endpoint injection | Custom RPC URLs are validated (must be `https://` prefix, valid URL format). |

---

## Testing Strategy

### Unit Tests (Vitest)

- `format.js` — price formatting, compact numbers, address truncation
- `base58.js` — address validation (valid addresses, invalid chars, wrong length)
- `storage.js` — localStorage wrapper (get/set/remove, JSON parse errors, quota exceeded)
- `char-selector.js` — character cycling, slot navigation, completion event
- `polling.js` — interval management, pause on hidden, resume on visible

### Integration Testing

- Test all views in Chrome at 600×600 viewport with arrow key navigation only.
- Verify every focusable element is reachable and activatable.
- Test wallet import flow end-to-end: companion page → pairing code → glasses entry → data load.

### MRBD-Specific Testing

- Deploy to Vercel, add URL in Meta AI app, test on actual glasses.
- Verify additive display readability in various lighting conditions.
- Test Neural Band + captouch gesture navigation through all screens.
- Verify WebSocket reconnection after phone connection drops.

---

## Deployment Pipeline

```
Local dev (npx serve) → Push to main → Vercel auto-deploy → Test on MRBD
                                      ↓
                              Preview deploy on PR branches
```

- **Production:** `main` branch auto-deploys to `solvision.vercel.app`
- **Preview:** Every PR gets a unique preview URL for testing on glasses before merge.
- **Edge Functions:** `api/` directory deploys as Vercel Edge Functions automatically.
- **Domain:** Custom domain `solvision.app` (planned) with Vercel DNS.
