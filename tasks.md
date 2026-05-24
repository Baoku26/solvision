# SolVision — Task Breakdown

> Track progress by changing `[ ]` to `[x]` as tasks are completed.
> Each task includes acceptance criteria (AC) that must pass before marking complete.

---

## Phase 0: Project Scaffolding

### 0.1 Initialize project structure
- [x] Create directory structure matching CLAUDE.md spec
- [x] Create `package.json` with project metadata (name: solvision, type: module)
- [x] Add vitest as dev dependency
- [x] Create `vercel.json` with routes config (SPA fallback, Edge Function routing)
- [x] Create `.gitignore` (node_modules, .vercel, .env)
- [x] Initialize git repo, set `main` as default branch

**AC:** `npx serve public` serves index.html at localhost:3000. `npx vitest run` executes with 0 tests.

### 0.2 Base HTML shell & CSS foundation
- [x] Create `public/index.html` with MRBD viewport meta tag (`width=600, height=600`)
- [x] Create `src/styles/variables.css` with full color palette, spacing, and typography tokens
- [x] Create `src/styles/base.css` with reset, body (600×600, overflow hidden, black bg), and font loading
- [x] Create `src/styles/focus.css` with `.focusable` styles, focus ring (cyan glow), and transition
- [x] Create `src/styles/components.css` (empty, will be populated per component)
- [x] Link all CSS in index.html, add `<script type="module" src="/src/app.js">`
- [x] Add favicon (PNG ≥52×52) and `manifest.webmanifest` with app icon

**AC:** Page loads at 600×600 with black background, JetBrains Mono loaded, no console errors. Favicon appears in browser tab.

### 0.3 Core utilities
- [x] Implement `src/utils/format.js`: `formatPrice(n)`, `formatHoldings(amount, symbol)`, `formatCompact(n)`, `truncateAddress(addr)`
- [x] Implement `src/utils/base58.js`: `isValidSolanaAddress(str)` — Base58 charset check + 32-44 char length
- [x] Implement `src/services/storage.js`: `get(key)`, `set(key, val)`, `remove(key)`, `clear()` with JSON parse/stringify and error handling
- [x] Implement `src/utils/polling.js`: `createPoller(fn, intervalMs)` → `{ start, stop, setInterval }` with `visibilitychange` pause/resume
- [x] Write unit tests for all four modules

**AC:** `npx vitest run` — all tests pass. format functions handle edge cases (0, negative, very small decimals, millions). Base58 rejects invalid addresses. Polling pauses when document is hidden.

---

## Phase 1: Navigation & View System

### 1.1 D-pad input handler
- [x] Implement global `keydown` listener in `app.js` for ArrowUp/Down/Left/Right, Enter, Escape
- [x] Implement `moveFocus(direction)` — queries `.focusable:not([disabled])` scoped to the active view, cycles through them
- [x] Enter triggers `.click()` on the focused element
- [x] Escape calls `navigateBack()` in the router

**AC:** Arrow keys cycle focus through focusable elements. Focus wraps at list boundaries. Enter activates the focused element. Works identically to Neural Band/captouch input on MRBD.

### 1.2 View router
- [x] Implement `src/app.js` router: `navigateTo(viewName, params)`, `navigateBack()`
- [x] Track navigation stack (max depth 2) for back navigation
- [x] Each view registers via `registerView(name, { render, mount, unmount })`
- [x] On navigate: call `unmount()` on current view, `render()` on target, `mount()` for focus setup
- [x] Create empty view containers in index.html (div per view, all `display: none` except dashboard)

**AC:** `navigateTo('detail', { tokenIndex: 0 })` switches views. Escape returns to previous view. Focus is set correctly after every transition. No view shows scrollbars.

### 1.3 Header component
- [x] Implement `src/components/header.js`: brand icon + name, network indicator (dot + label), live clock
- [x] Clock updates every 10 seconds via `setInterval`
- [x] Network label reads from state (`Mainnet` / `Devnet`)
- [x] Export `updateNetworkStatus(network)` for settings changes

**AC:** Header renders at top of viewport. Clock shows current time in HH:MM format. Network dot pulses green.

### 1.4 Status bar component
- [x] Implement `src/components/status-bar.js`: nav hint arrows, TPS counter
- [x] Export `updateTPS(value)` called by TPS polling

**AC:** Status bar renders at bottom. TPS displays formatted number with commas.

---

## Phase 2: Wallet Import

### 2.1 Pairing API (Vercel Edge Functions)
- [ ] Implement `api/pair.js`:
  - `POST /api/pair` — validates address (Base58), generates 6-char alphanumeric code, stores in Vercel KV (TTL 600s), returns `{ code }`
  - `GET /api/pair/[code]` — retrieves address by code, deletes code from KV, returns `{ address }` or 404
- [ ] Rate limit: 5 POST requests per IP per minute (use KV counter with TTL)
- [ ] Implement `api/health.js` — returns `{ ok: true, timestamp }`

**AC:** `curl -X POST /api/pair -d '{"address":"validAddr"}'` returns a 6-char code. `GET /api/pair/CODE` returns the address and subsequent GETs return 404. Codes expire after 10 minutes.

### 2.2 Companion setup page
- [ ] Create `public/setup.html` — standalone page for phone/desktop
- [ ] Single text input: "Paste your Solana wallet address"
- [ ] Client-side Base58 validation with inline error
- [ ] On submit: calls POST /api/pair, displays the 6-char code prominently
- [ ] Shows countdown timer (10 min) and instructions: "Enter this code on your glasses"
- [ ] Mobile-responsive design (this page is viewed on phone, not glasses)

**AC:** Valid address → code displayed. Invalid address → inline error. Code is visible and copyable. Page works on mobile Safari and Chrome.

### 2.3 Character selector component
- [ ] Implement `src/components/char-selector.js`
- [ ] Configurable: charset (alphanumeric for pairing, Base58 for address), slot count (6 or 44)
- [ ] Arrow Up/Down cycles characters in active slot
- [ ] Arrow Left/Right moves between slots
- [ ] Enter on last filled slot triggers `complete` callback with assembled string
- [ ] Visual: active slot highlighted with cyan glow, up/down arrow hints, 24px character display
- [ ] Write unit tests for character cycling and completion

**AC:** 6-slot alphanumeric selector allows entering any code via arrow keys only. Completion fires with correct string. Focus visuals match design spec.

### 2.4 Import wallet view
- [ ] Implement `src/views/import-wallet.js`
- [ ] Three import methods accessible via focusable menu:
  1. "Enter Pairing Code" → renders char-selector (6 slots, alphanumeric)
  2. "Paste via Link" → instructions to use deeplink on phone
  3. "Enter Address Manually" → renders char-selector (44 slots, Base58)
- [ ] On pairing code complete: call GET /api/pair/:code → validate address → save to localStorage → navigate to dashboard
- [ ] On manual address complete: validate Base58 → save to localStorage → navigate to dashboard
- [ ] Handle deeplink: on app boot, check `window.location.search` for `addr` param → validate → save → clear URL
- [ ] Error states: "Invalid code", "Code expired", "Invalid address", "Wallet limit reached (max 5)", "Already connected"
- [ ] Success state: "Wallet connected!" notification banner → redirect to dashboard

**AC:** All three import methods work end-to-end. Error messages display correctly. Wallet is saved in localStorage and appears in manage wallets screen.

### 2.5 Manage wallets view
- [ ] Implement `src/views/manage-wallets.js`
- [ ] List all saved wallets: label, truncated address, "Active" badge on current
- [ ] Arrow keys to navigate; Enter to select → submenu: "Set Active" / "Rename" / "Remove"
- [ ] Remove triggers confirmation: "Remove this wallet?" with focusable Yes/No
- [ ] "Add Wallet" item at bottom → navigates to import view
- [ ] If last wallet is removed → redirect to import view

**AC:** Can switch active wallet and see portfolio update. Can remove a wallet with confirmation. Cannot exceed 5 wallets.

---

## Phase 3: Live Data Integration

### 3.1 Solana RPC client
- [ ] Implement `src/services/rpc.js`
- [ ] `getBalance(address)` — returns SOL balance (convert lamports to SOL)
- [ ] `getTokenAccountsByOwner(address)` — returns array of `{ mint, balance, decimals }`
- [ ] `getRecentPerformanceSamples(1)` — returns current TPS
- [ ] All calls use configured RPC endpoint from localStorage (default: Helius)
- [ ] Error handling: network errors return `{ error, cached: lastKnownValue }`
- [ ] Request timeout: 10 seconds

**AC:** With a valid mainnet address, returns correct SOL balance and token accounts. Falls back to cached data on error.

### 3.2 Jupiter price client
- [ ] Implement `src/services/prices.js`
- [ ] `getBatchPrices(mintAddresses[])` — single call to Jupiter Price API v2
- [ ] Returns `{ [mint]: { price, change24h } }`
- [ ] Cache results in memory and localStorage (`sv_price_cache`)
- [ ] Fallback: if Jupiter fails 3x consecutively, switch to CoinGecko for next 5 minutes

**AC:** Batch price request returns correct prices for SOL + at least 5 SPL tokens. Cached data is used when API is down.

### 3.3 Token metadata resolution
- [ ] Map token mints to human-readable names, symbols, and icon colors
- [ ] Use a hardcoded registry in `src/constants.js` for top 20 Solana tokens
- [ ] For unknown tokens: display truncated mint address as name, "?" as icon

**AC:** SOL, USDC, USDT, JUP, RAY, BONK, WIF, JTO, RNDR, PYTH all display correct names and symbols.

### 3.4 WebSocket transaction monitor
- [ ] Implement `src/services/websocket.js`
- [ ] Subscribe to `accountSubscribe` for the active wallet's SOL account
- [ ] Subscribe to `logsSubscribe` with `mentions: [walletAddress]` for SPL transfers
- [ ] On notification: parse transaction type (received/sent/swap), trigger notification banner, refresh balances
- [ ] Reconnect with exponential backoff on disconnect (1s → 2s → 4s → 8s → max 30s)
- [ ] `disconnect()` on wallet switch or app unmount

**AC:** Receiving SOL to the watched address triggers a notification within 3 seconds. WebSocket reconnects automatically after simulated disconnect.

---

## Phase 4: Dashboard & Detail Views

### 4.1 Dashboard view (home screen)
- [ ] Implement `src/views/dashboard.js`
- [ ] Portfolio section: total USD value (large), 24h weighted change, SOL balance
- [ ] Token list: render token items with virtual list windowing (6 visible at a time)
- [ ] Token list items are focusable; Enter opens detail view for that token
- [ ] Settings button (focusable) at top of token list → navigates to settings
- [ ] Wire up polling: prices (configurable interval), balances (30s), TPS (15s)
- [ ] All pollers pause on `visibilitychange` hidden, resume on visible

**AC:** Dashboard shows real portfolio data from the imported wallet. Prices update every 10s (default). Arrow keys navigate the token list. Focus wraps correctly. Battery-conscious: no polling when backgrounded.

### 4.2 Token item component
- [ ] Implement `src/components/token-item.js`
- [ ] Displays: icon (colored circle), symbol, name, holdings, USD value, price, 24h change
- [ ] Change color: green (`--sol-cyan`) for positive, red (`--sol-hot`) for negative
- [ ] Focus state: cyan border + glow per design spec
- [ ] Export `update(tokenData)` for in-place updates without re-creating DOM node

**AC:** Token item matches prototype design. Updates in place without flickering on price ticks.

### 4.3 Token detail view
- [ ] Implement `src/views/detail.js`
- [ ] Large price display with 24h change (colored)
- [ ] Sparkline canvas chart: 24h price history, gradient fill, pulsing end-dot
- [ ] Stats grid: 24h high, 24h low, holdings quantity, holdings USD value
- [ ] Back button (focusable) → returns to dashboard with focus on the same token
- [ ] Auto-updates with each price tick

**AC:** Detail view renders for any token. Sparkline animates smoothly. Back returns to the correct list position.

### 4.4 Sparkline component
- [ ] Implement `src/components/sparkline.js`
- [ ] Canvas rendering at 2x DPR for retina sharpness
- [ ] Gradient fill: line color to transparent
- [ ] Pulsing end-dot at the current price
- [ ] `update(dataPoints[])` redraws efficiently with `requestAnimationFrame`
- [ ] Color: green if last > first, red if last < first

**AC:** Sparkline renders a smooth line chart. Updates without flicker. Colors match price direction.

### 4.5 Notification component
- [ ] Implement `src/components/notification.js`
- [ ] Slide-in banner from top, auto-dismiss after 4s
- [ ] FIFO queue: only 1 visible at a time, queued notifications show sequentially
- [ ] Display: icon + text + timestamp ("just now")
- [ ] Does not steal focus from current view

**AC:** Notifications slide in and out smoothly. Multiple notifications queue correctly. Focus is not disrupted.

---

## Phase 5: Settings & Configuration

### 5.1 Settings view
- [ ] Implement `src/views/settings.js`
- [ ] Focusable menu items, each with current value displayed:
  - Active Wallet → opens manage wallets
  - Network → toggle Mainnet / Devnet
  - RPC Endpoint → submenu: Public / Helius / QuickNode / Custom
  - Price Refresh → cycle: 5s / 10s / 30s / 60s
  - Currency → cycle: USD / EUR / GBP / NGN
  - Token Filter → toggle: All / Non-zero only
  - Import Wallet → opens import flow
  - About → version, build info
- [ ] Changes save to localStorage immediately on selection
- [ ] Network/RPC changes trigger reconnection of WebSocket and re-fetch of all data

**AC:** All settings are navigable with arrow keys. Changes persist across sessions. Switching network re-fetches data from the correct cluster.

### 5.2 Price alerts (P1)
- [ ] Add "Price Alerts" item to settings menu
- [ ] Alert config screen: select token → set direction (above/below) → set price threshold via digit selector
- [ ] Store up to 10 alerts in localStorage (`sv_price_alerts`)
- [ ] On each price tick, check all active alerts; trigger notification if threshold crossed
- [ ] Alerts auto-deactivate after triggering (single-use)

**AC:** Can set a price alert for SOL above $200. When price crosses threshold, notification fires. Alert is marked as triggered.

---

## Phase 6: Polish & Optimization

### 6.1 Loading & boot sequence
- [ ] Show loading animation (spinning ring + "Connecting to Solana") on app boot
- [ ] Sequence: load config from localStorage → validate wallet → fetch initial data → hide loader → render dashboard
- [ ] If no wallet configured: skip loader → show import view directly
- [ ] Timeout: if initial data fetch takes >5s, show dashboard with cached data + "Updating..." indicator

**AC:** Clean boot animation. Loads within 2 seconds on good network. Gracefully handles no-wallet state.

### 6.2 Error states & offline handling
- [ ] Implement "Offline" banner when all network requests fail
- [ ] "Stale" indicator (dimmed clock icon) next to prices older than 60s
- [ ] "No wallet" state redirects to import
- [ ] "RPC Error" state shows last cached data with warning
- [ ] All error states are recoverable without app restart

**AC:** Disconnect network → app shows offline state. Reconnect → app recovers automatically. No blank screens ever.

### 6.3 Performance audit
- [ ] Total bundle size < 80KB gzipped
- [ ] First meaningful paint < 800ms
- [ ] Price tick DOM update < 16ms (measure with Performance API)
- [ ] No memory leaks: verify with Chrome DevTools after 30 minutes of runtime
- [ ] localStorage usage < 500KB

**AC:** All performance budgets met. No jank on price updates. Memory stable over extended runtime.

### 6.4 MRBD compliance check
- [ ] Viewport is exactly 600×600, no scrolling anywhere
- [ ] All interactive elements reachable via arrow keys + Enter only
- [ ] No element uses mouse hover, touch, or keyboard text input
- [ ] All text meets minimum size requirements (16px body, 20px primary)
- [ ] Black background on all views (transparent on additive display)
- [ ] High contrast: all text passes WCAG AA against black background
- [ ] App icon (PNG ≥52×52) displays correctly in MRBD app grid

**AC:** Passes all checks in Meta's MRBD Web App guidelines. Functions correctly on actual glasses hardware.

### 6.5 Deployment & sharing
- [ ] Deploy to Vercel production
- [ ] Test on MRBD glasses: import wallet → browse portfolio → view detail → check notifications → change settings
- [ ] Generate share deeplink and QR code for easy distribution
- [ ] Write README.md with setup instructions for other developers

**AC:** App is live at production URL. Share link allows other MRBD users to add the app in one tap.

---

## Backlog (Post-v1.0)

- [ ] NFT gallery view (v1.1)
- [ ] Whale wallet watchlist (v1.2)
- [ ] Multiple currency conversion with live forex (v1.1)
- [ ] Custom RPC URL input via companion page (v1.1)
- [ ] DeFi position tracking — staking, LP, lending (v2.0)
- [ ] Neural Band gesture authentication for signing (v2.0)
- [ ] Android XR glasses port (v2.1)
- [ ] Always-on widget/sidebar mode (v2.1)
