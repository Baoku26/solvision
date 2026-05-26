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
- [x] Implement `api/pair/index.js`: POST — validates Base58, generates 6-char code, stores in KV (TTL 600s)
- [x] Implement `api/pair/[code].js`: GET — retrieves address, deletes after use (single-use); DELETE — cleanup
- [x] Rate limit: 5 POSTs per IP per minute via KV counter with TTL
- [x] Implement `api/health.js` — returns `{ ok: true, timestamp }`

**AC:** POST returns 6-char code. GET returns address and subsequent GETs return 404. Codes expire after 10 minutes.

### 2.2 Companion setup page
- [x] Create `public/setup.html` — standalone page for phone/desktop
- [x] Single text input: "Paste your Solana wallet address"
- [x] Client-side Base58 validation with inline error
- [x] On submit: calls POST /api/pair, displays the 6-char code prominently
- [x] Shows countdown timer (10 min) and instructions: "Enter this code on your glasses"
- [x] Mobile-responsive design (this page is viewed on phone, not glasses)

**AC:** Valid address → code displayed. Invalid address → inline error. Code is visible and copyable. Page works on mobile Safari and Chrome.

### 2.3 Character selector component
- [x] Implement `src/components/char-selector.js`
- [x] Configurable: charset (alphanumeric for pairing, Base58 for address), slot count (6 or 44)
- [x] Arrow Up/Down cycles characters in active slot
- [x] Arrow Left/Right moves between slots
- [x] Enter on last filled slot triggers `complete` callback + dispatches CustomEvent
- [x] For > 8 slots: sliding window of 8 visible slots with progress indicator
- [x] Visual: active slot highlighted with cyan border, up/down arrow hints, 24px character display
- [x] 18 unit tests — all passing

**AC:** 6-slot alphanumeric selector allows entering any code via arrow keys only. Completion fires with correct string. Arrow events stop propagation so global nav handler is not triggered.

### 2.4 Import wallet view
- [x] Implement `src/views/import-wallet.js`
- [x] Three import methods: "Enter Pairing Code" / "Paste via Link" / "Enter Address Manually"
- [x] Pairing code: char-selector (6 slots, alphanumeric) → GET /api/pair/:code → save → navigate
- [x] Manual: char-selector (44 slots, Base58) → validate → save → navigate
- [x] Deeplink: handled in app.js boot — `?addr=` param → validate → save → clear URL
- [x] Error states: inline error screen with "← Try again" back button
- [x] Loading state: spinner while fetching pairing address

**AC:** All three import methods implemented. Error messages display correctly. Wallet saved to localStorage.

### 2.5 Manage wallets view
- [x] Implement `src/views/manage-wallets.js`
- [x] List all saved wallets: label, truncated address, "Active" badge on current
- [x] Enter on wallet → submenu overlay: "Set Active" / "Remove" / "Cancel"
- [x] Remove → confirmation overlay: "Remove / Cancel" — aria-disabled on list items during overlay
- [x] "Add Wallet" item at bottom → navigates to import view
- [x] If last wallet is removed → navigates to import view

**AC:** Can switch active wallet. Can remove with confirmation. Cannot exceed 5 wallets.

---

## Phase 3: Live Data Integration

### 3.1 Solana RPC client
- [x] Implement `src/services/rpc.js`
- [x] `getBalance(address, cached?)` — returns `{ data: SOL, error }` (lamports ÷ 1e9)
- [x] `getTokenAccountsByOwner(address, cached?)` — returns `{ data: [{mint,balance,decimals}], error }`
- [x] `getRecentTPS(cached?)` — returns `{ data: tps, error }` from `getRecentPerformanceSamples`
- [x] All calls use RPC endpoint from localStorage (default: public mainnet)
- [x] Timeout: 10s via AbortController; errors return `{ data: cachedValue, error: message }`
- [x] 14 unit tests covering balance parsing, token account parsing, TPS, error fallback

**AC:** Tests pass with mocked fetch. Falls back to cached data on error.

### 3.2 Jupiter price client
- [x] Implement `src/services/prices.js`
- [x] `getBatchPrices(mints[])` — fetches Jupiter v4 batch endpoint
- [x] Returns `{ data: { [mint]: { price, change24h } }, error, stale }`
- [x] `change24h` calculated from stored price history (`sv_price_history`, max 30 pts/token, 24h TTL)
- [x] Caches to localStorage `sv_price_cache` on every successful fetch
- [x] Fallback: after 3 consecutive Jupiter failures, switches to CoinGecko for 5 minutes
- [x] `getCachedPrices()` and `getPriceHistory(mint)` exported for sparklines
- [x] `compute24hChange(prices, history)` exported and unit-tested

**AC:** 14 tests covering Jupiter fetch, cache fallback, 24h change calculation.

### 3.3 Token metadata resolution
- [x] `TOKEN_REGISTRY` in `src/constants.js`: 15 tokens including SOL, USDC, USDT, JUP, RAY, BONK, WIF, JTO, RNDR, PYTH, mSOL, bSOL, ETH (Wormhole), WBTC, ORCA
- [x] `getTokenMeta(mint)` — returns metadata or derived stub for unknown mints
- [x] Each entry: `{ symbol, name, color, coingeckoId }`

**AC:** All 10 spec tokens present with correct names and symbols (verified by test).

### 3.4 WebSocket transaction monitor
- [x] Implement `src/services/websocket.js`
- [x] `wsMonitor.connect(address)` — opens WS, subscribes to `accountSubscribe` + `logsSubscribe`
- [x] Dispatches `sv:balance-changed` and `sv:transaction` CustomEvents on notifications
- [x] Transaction type parsed from logs: 'sol' | 'token' | 'swap'
- [x] Exponential backoff reconnect: 1s → 2s → 4s → 8s → 16s → 30s max
- [x] `wsMonitor.disconnect()` stops reconnect loop, closes socket cleanly
- [x] WS URL derived from HTTP RPC URL (https:// → wss://)

**AC:** Service implemented; integration test requires real Solana WS (manual test on deploy).

---

## Phase 4: Dashboard & Detail Views

### 4.1 Dashboard view (home screen)
- [x] Implement `src/views/dashboard.js`
- [x] Portfolio section: total USD value (large), 24h weighted change, SOL balance
- [x] Token list: render token items with virtual list windowing (6 visible at a time)
- [x] Token list items are focusable; Enter opens detail view for that token
- [x] Settings button (focusable) at top of token list → navigates to settings
- [x] Wire up polling: prices (configurable interval), balances (30s), TPS (15s)
- [x] All pollers pause on `visibilitychange` hidden, resume on visible

**AC:** Dashboard shows real portfolio data from the imported wallet. Prices update every 10s (default). Arrow keys navigate the token list. Focus wraps correctly. Battery-conscious: no polling when backgrounded.

### 4.2 Token item component
- [x] Implement `src/components/token-item.js`
- [x] Displays: icon (colored circle), symbol, name, holdings, USD value, price, 24h change
- [x] Change color: green (`--sol-cyan`) for positive, red (`--sol-hot`) for negative
- [x] Focus state: cyan border + glow per design spec
- [x] Export `update(tokenData)` for in-place updates without re-creating DOM node

**AC:** Token item matches prototype design. Updates in place without flickering on price ticks.

### 4.3 Token detail view
- [x] Implement `src/views/detail.js`
- [x] Large price display with 24h change (colored)
- [x] Sparkline canvas chart: 24h price history, gradient fill, pulsing end-dot
- [x] Stats grid: 24h high, 24h low, holdings quantity, holdings USD value
- [x] Back button (focusable) → returns to dashboard with focus on the same token
- [x] Auto-updates with each price tick

**AC:** Detail view renders for any token. Sparkline animates smoothly. Back returns to the correct list position.

### 4.4 Sparkline component
- [x] Implement `src/components/sparkline.js`
- [x] Canvas rendering at 2x DPR for retina sharpness
- [x] Gradient fill: line color to transparent
- [x] Pulsing end-dot at the current price
- [x] `update(dataPoints[])` redraws efficiently with `requestAnimationFrame`
- [x] Color: green if last > first, red if last < first

**AC:** Sparkline renders a smooth line chart. Updates without flicker. Colors match price direction.

### 4.5 Notification component
- [x] Implement `src/components/notification.js`
- [x] Slide-in banner from top, auto-dismiss after 4s
- [x] FIFO queue: only 1 visible at a time, queued notifications show sequentially
- [x] Display: icon + text + timestamp ("just now")
- [x] Does not steal focus from current view

**AC:** Notifications slide in and out smoothly. Multiple notifications queue correctly. Focus is not disrupted.

---

## Phase 5: Settings & Configuration

### 5.1 Settings view
- [x] Implement `src/views/settings.js`
- [x] Focusable menu items, each with current value displayed:
  - Active Wallet → opens manage wallets
  - Network → toggle Mainnet / Devnet
  - RPC Endpoint → submenu: Public / Helius / QuickNode
  - Price Refresh → cycle: 5s / 10s / 30s / 60s
  - Currency → cycle: USD / EUR / GBP / NGN
  - Token Filter → toggle: All / Non-zero only
  - Import Wallet → opens import flow
  - About → version, build info
- [x] Changes save to localStorage immediately on selection
- [x] Network/RPC changes trigger reconnection of WebSocket and re-fetch of all data

**AC:** All settings are navigable with arrow keys. Changes persist across sessions. Switching network re-fetches data from the correct cluster.

### 5.2 Price alerts (P1)
- [x] Add "Price Alerts" item to settings menu
- [x] Alert config screen: select token → set direction (above/below) → set price threshold via stepper (↑↓ adjust, ←→ step size)
- [x] Store up to 10 alerts in localStorage (`sv_price_alerts`)
- [x] On each price tick, check all active alerts; trigger notification if threshold crossed
- [x] Alerts auto-deactivate after triggering (single-use)

**AC:** Can set a price alert for SOL above $200. When price crosses threshold, notification fires. Alert is marked as triggered.

---

## Phase 6: Polish & Optimization

### 6.1 Loading & boot sequence
- [x] Show loading animation (spinning ring + "Connecting to Solana") on app boot
- [x] Sequence: load config from localStorage → validate wallet → fetch initial data → hide loader → render dashboard
- [x] If no wallet configured: skip loader → show import view directly
- [x] Timeout: if initial data fetch takes >5s, show dashboard with cached data + "Updating..." indicator

**AC:** Clean boot animation. Loads within 2 seconds on good network. Gracefully handles no-wallet state.

### 6.2 Error states & offline handling
- [x] Implement "Offline" banner when all network requests fail
- [x] "Stale" indicator (dimmed clock icon) next to prices older than 60s
- [x] "No wallet" state redirects to import
- [x] "RPC Error" state shows last cached data with warning
- [x] All error states are recoverable without app restart

**AC:** Disconnect network → app shows offline state. Reconnect → app recovers automatically. No blank screens ever.

### 6.3 Performance audit
- [x] Total bundle size < 80KB gzipped
- [x] First meaningful paint < 800ms
- [x] Price tick DOM update < 16ms (measure with Performance API)
- [x] No memory leaks: verify with Chrome DevTools after 30 minutes of runtime
- [x] localStorage usage < 500KB

**AC:** All performance budgets met. No jank on price updates. Memory stable over extended runtime.

### 6.4 MRBD compliance check
- [x] Viewport is exactly 600×600, no scrolling anywhere
- [x] All interactive elements reachable via arrow keys + Enter only
- [x] No element uses mouse hover, touch, or keyboard text input
- [x] All text meets minimum size requirements (16px body, 20px primary)
- [x] Black background on all views (transparent on additive display)
- [x] High contrast: all text passes WCAG AA against black background
- [x] App icon (PNG ≥52×52) displays correctly in MRBD app grid

**AC:** Passes all checks in Meta's MRBD Web App guidelines. Functions correctly on actual glasses hardware.

### 6.5 Deployment & sharing
- [x] Deploy to Vercel production
- [ ] Test on MRBD glasses: import wallet → browse portfolio → view detail → check notifications → change settings
- [x] Generate share deeplink and QR code for easy distribution
- [x] Write README.md with setup instructions for other developers

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
