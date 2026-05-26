# SolVision

Solana wallet HUD for Meta Ray-Ban Display (MRBD) smart glasses. Renders real-time portfolio data, live token prices, and transaction notifications as a transparent overlay on the additive waveguide display.

## Tech Stack

- **Runtime:** Vanilla HTML/CSS/JS (no framework). Total bundle must stay under 80KB gzipped.
- **Hosting:** Vercel (static deploy, Edge Functions for pairing API)
- **Blockchain:** Solana JSON-RPC via Helius (primary) / QuickNode (fallback) / public (last resort)
- **Price data:** Jupiter Price API v2 (batch endpoint)
- **Real-time:** Solana WebSocket subscriptions (`accountSubscribe`, `logsSubscribe`)
- **Pairing server:** Vercel Edge Functions + KV store (ephemeral pairing codes, 10min TTL)

## Platform Constraints (MRBD Web App)

These are hardware-enforced and non-negotiable:

- **Viewport:** Fixed 600×600px. No scrolling. Set `overflow: hidden` on body.
- **Input:** Arrow keys (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) + `Enter` only. No mouse, touch, or keyboard text input. Every interactive element needs class `focusable` and `tabindex="0"`.
- **Display:** Additive waveguide — black (#000) pixels are transparent. Use bright text/elements on black backgrounds. Never use white or light backgrounds.
- **Typography:** Minimum 16px body, 20-24px primary content. Font: JetBrains Mono.
- **Colors:** Use the CSS custom properties defined in `src/styles/variables.css`. Primary accent is `--sol-cyan: #00FFA3`, secondary is `--sol-purple: #9945FF`.
- **No camera/mic/text-input/notifications/offline support** in the web app runtime.

## Project Structure

```
solvision/
├── CLAUDE.md
├── planning.md
├── tasks.md
├── vercel.json
├── package.json
├── public/
│   ├── index.html          # Entry point loaded by MRBD
│   ├── manifest.webmanifest
│   └── icons/
├── src/
│   ├── app.js              # Boot sequence, router, global state
│   ├── styles/
│   │   ├── variables.css   # CSS custom properties (colors, spacing)
│   │   ├── base.css        # Reset, body, additive display defaults
│   │   ├── components.css  # Token items, cards, notification bar
│   │   └── focus.css       # Focus ring styles, focusable element rules
│   ├── views/
│   │   ├── dashboard.js    # Home screen: portfolio + token list
│   │   ├── detail.js       # Token detail: price, sparkline, stats
│   │   ├── settings.js     # Settings menu
│   │   ├── import-wallet.js # Wallet import flows (pairing, deeplink, manual)
│   │   └── manage-wallets.js # Wallet list, switch, remove
│   ├── components/
│   │   ├── header.js       # Brand, network indicator, clock
│   │   ├── token-item.js   # Single token row (icon, price, change)
│   │   ├── notification.js # Slide-in notification banner
│   │   ├── sparkline.js    # Canvas-based price chart
│   │   ├── char-selector.js # Arrow-key character/digit input component
│   │   └── status-bar.js   # Bottom bar: nav hints, TPS
│   ├── services/
│   │   ├── rpc.js          # Solana JSON-RPC client (getBalance, getTokenAccounts)
│   │   ├── prices.js       # Jupiter Price API v2 client
│   │   ├── websocket.js    # Solana WebSocket subscription manager
│   │   ├── pairing.js      # Pairing code API client
│   │   └── storage.js      # localStorage wrapper with JSON serialization
│   ├── utils/
│   │   ├── format.js       # Price formatting, compact numbers, address truncation
│   │   ├── base58.js       # Base58 validation
│   │   └── polling.js      # Configurable polling manager with pause/resume
│   └── constants.js        # RPC endpoints, API URLs, token registry, defaults
├── api/
│   ├── pair.js             # POST: create pairing code; GET: retrieve address by code
│   └── health.js           # Health check endpoint
└── tests/
    ├── format.test.js
    ├── base58.test.js
    ├── storage.test.js
    └── char-selector.test.js
```

## Commands

```bash
# Dev server (serves public/ on localhost:3000)
npx serve public -l 3000

# Deploy to Vercel
vercel --prod

# Run tests
npx vitest run

# Validate HTML for MRBD compliance (custom script)
node scripts/validate-mrbd.js

# Bundle size check
du -sh public/ | head -1
```

## Code Conventions

- **No build step.** All JS uses ES modules with `<script type="module">`. No bundler, no transpiler.
- **No frameworks.** No React, Vue, or Svelte. Vanilla DOM manipulation only. This keeps the bundle tiny and avoids runtime overhead on the constrained glasses environment.
- **Functions over classes** for components. Each view/component exports a `render()` function that returns a DOM element or updates an existing one.
- **CSS custom properties** for all colors, spacing, and sizes. Never hardcode hex values in JS.
- **Focus management is critical.** After any view transition, the correct element must receive `.focus()`. Test every flow with arrow keys only.
- **Graceful degradation.** Every network call must have error handling that shows cached/stale data with a visual indicator rather than a blank screen.
- **No console.log in production.** Use a `debug.js` utility that can be toggled via localStorage flag.

## Key Patterns

### View Router
Views are swapped by toggling `display: none/flex` on view containers. The `app.js` router tracks `currentView` state and manages focus handoff between views.

### Polling Manager
`polling.js` exports a `createPoller(fn, intervalMs)` that returns `{ start, stop, setInterval }`. All pollers pause when the document is hidden (glasses app backgrounded) and resume on visibility change.

### Character Selector
The `char-selector.js` component is reused for pairing code entry (alphanumeric, 6 slots) and manual address entry (Base58 charset, 44 slots). It emits a `complete` event when all slots are filled and confirmed.

### Notification Queue
`notification.js` maintains a FIFO queue. Only one banner is visible at a time. Each banner auto-dismisses after 4 seconds. New notifications during an active banner are queued.

## Things to Watch Out For

- **Never use `scroll` or `overflow: auto`.** The MRBD viewport does not scroll. Use focus-based virtual list rendering for long lists.
- **Never use `addEventListener('click', ...)` without also handling `Enter` keydown.** Click events don't fire from Neural Band input.
- **Never fetch from HTTP URLs.** MRBD requires HTTPS for everything.
- **RPC rate limits:** Public Solana RPC is rate-limited aggressively. Always use the configured private RPC endpoint. Batch requests where possible.
- **localStorage is 5MB max.** Don't store price history longer than 24 hours. Prune on boot.
- **Font loading:** JetBrains Mono is loaded from Google Fonts CDN. If it fails, fallback to `monospace`. Don't block render on font load.

---

## Session Summary (2026-05-24)

### Completed Tasks

**Phase 0 scaffolding is done (tasks 0.1 – 0.3).**

#### 0.1 — Project structure
- Initialized git repo (`main` branch)
- Created `package.json` (`type: module`, vitest dev dep, `--passWithNoTests` flag)
- Created `vercel.json` (`outputDirectory: "public"`, edge functions for `api/*`, SPA rewrite)
- Created `.gitignore`
- Created all directory skeletons

#### 0.2 — HTML shell & CSS foundation
- `public/index.html` — MRBD viewport meta (`width=600, height=600`), JetBrains Mono via Google Fonts (`display=swap`), all CSS linked, ES module script
- `public/src/styles/variables.css` — full design token set: `--sol-cyan`, `--sol-purple`, `--sol-hot`, background layers, text, border, focus glow, 4px spacing grid, typography scale, animation easings
- `public/src/styles/base.css` — reset, 600×600 body with `overflow: hidden`, `.view` / `.view.active` display pattern, utility classes
- `public/src/styles/focus.css` — `.focusable` class with cyan glow ring, `focus-pulse` keyframe animation
- `public/src/styles/components.css` — empty placeholder
- `public/manifest.webmanifest` + `public/icons/icon.svg` + `icon-64.png` / `icon-192.png` (PNG generated via `scripts/gen-icon.js`)

#### 0.3 — Core utilities + tests (63 tests, all passing)
- `public/src/utils/format.js` — `formatPrice` (8-tier precision), `formatHoldings` (B/M/commas/decimals), `formatCompact` (T/B/M/K), `truncateAddress`
- `public/src/utils/base58.js` — `isValidSolanaAddress` (Base58 regex + 32–44 char range)
- `public/src/services/storage.js` — `get/set/remove/clear` wrapping `localStorage` with silent JSON error handling
- `public/src/utils/polling.js` — `createPoller(fn, ms)` → `{ start, stop, setInterval }` with `visibilitychange` pause/resume
- Tests in `tests/` using Vitest + `happy-dom` for DOM-requiring modules

### Key Implementation Decision

**Source files live at `public/src/`**, not the project-root `src/` shown in the original structure diagram. This is required because `npx serve public` only serves the `public/` directory — putting JS in `public/src/` makes `/src/app.js` reachable at dev time and on Vercel (via `outputDirectory: "public"`). The root-level `src/` directories are vestigial from the initial scaffold and unused.

### Session Summary (2026-05-24 continued)

**Phase 1: Navigation & View System is done (tasks 1.1 – 1.4).**

#### 1.1 — D-pad input handler
- Global `keydown` listener: ArrowUp/Down/Left/Right, Enter, Escape
- `moveFocus(forward)` scoped to `.view.active`, cycles `.focusable:not([disabled])` elements
- Enter triggers `.click()` on `document.activeElement`; Escape calls `navigateBack()`
- Components can call `e.stopPropagation()` to intercept arrow keys (used by char-selector later)

#### 1.2 — View router
- `registerView(name, { render, mount, unmount })` — stores handler in registry
- `navigateTo(viewName, params)` — unmounts current, activates next, calls render→mount
- `navigateBack()` — pops nav stack (max depth 2), restores previous view
- All 5 view containers added to `index.html`; stub registrations in place until Phase 2+
- `#app` layout restructured: `#app-header` (52px) + `#app-main` (flex:1, position:relative) + `#app-status` (36px)

#### 1.3 — Header component
- `public/src/components/header.js` — brand icon + name, network dot (pulses green/yellow), live clock
- Clock ticks every 10s via `setInterval`; `updateNetworkStatus(network)` exported

#### 1.4 — Status bar component
- `public/src/components/status-bar.js` — nav hint glyphs (↑↓ ↵ Esc), TPS display
- `updateTPS(value)` exported; formats with `toLocaleString`

### Session Summary (2026-05-24 continued)

**Phase 2: Wallet Import is done (tasks 2.1 – 2.5).**

#### 2.1 — Pairing API (Vercel Edge Functions)
- `api/pair/index.js` — POST: validates Base58, generates 6-char code (`ALPHANUMERIC` charset), stores in KV with 600s TTL; rate-limited to 5 POSTs/IP/min via KV counter
- `api/pair/[code].js` — GET: single-use retrieval (deletes after fetch), 404 on miss; DELETE: manual cleanup
- `api/health.js` — `{ ok: true, timestamp }` health check

#### 2.2 — Companion setup page
- `public/setup.html` — standalone mobile page; client-side Base58 validation, POST /api/pair, 10-min countdown, system fonts (not JetBrains Mono)

#### 2.3 — Char selector component
- `public/src/components/char-selector.js` — `createCharSelector(container, { charset, slots, onComplete })`
- Sliding window of 8 visible slots for > 8-slot selectors (e.g. 44-slot Base58 address entry)
- All arrow keys call `e.stopPropagation()` to prevent global D-pad handler from firing
- 18 unit tests in `tests/char-selector.test.js`

#### 2.4 — Import wallet view
- `public/src/views/import-wallet.js` — three import modes: pairing code (6-slot alphanumeric → GET /api/pair/:code), manual (44-slot Base58 char selector), deeplink (`?addr=` URL param consumed on boot)
- Inline error + loading states; `register()` exported for `app.js`

#### 2.5 — Manage wallets view
- `public/src/views/manage-wallets.js` — list with active badge, submenu overlay (Set Active / Remove / Cancel), confirmation overlay; last wallet removed → redirect to import; max 5 wallets enforced

---

**Phase 3: Live Data Integration is done (tasks 3.1 – 3.4).**

#### 3.1 — Solana RPC client
- `public/src/services/rpc.js` — `getBalance`, `getTokenAccountsByOwner`, `getRecentTPS`; all return `{ data, error }`, never throw; 10s AbortController timeout; falls back to cached value on error
- 14 unit tests

#### 3.2 — Jupiter price client
- `public/src/services/prices.js` — `getBatchPrices(mints[])` → `{ data, error, stale }`
- After 3 consecutive Jupiter failures, switches to CoinGecko for 5 minutes
- 24h change computed from `sv_price_history` (max 30 pts/token, 24h TTL); no module-level in-memory cache — localStorage is single source of truth
- `getCachedPrices()`, `getPriceHistory(mint)`, `compute24hChange()` exported
- 14 unit tests

#### 3.3 — Token metadata
- `TOKEN_REGISTRY` in `constants.js` — 15 tokens: SOL, USDC, USDT, JUP, RAY, BONK, WIF, JTO, PYTH, RNDR, mSOL, bSOL, ETH (Wormhole), WBTC, ORCA
- `getTokenMeta(mint)` — returns registry entry or derived fallback stub

#### 3.4 — WebSocket monitor
- `public/src/services/websocket.js` — `wsMonitor.connect(address)` / `wsMonitor.disconnect()`
- Subscribes to `accountSubscribe` + `logsSubscribe`; dispatches `sv:balance-changed` and `sv:transaction` CustomEvents on `document`
- Transaction type parsed from logs: `'sol' | 'token' | 'swap'`
- Exponential backoff reconnect: 1s → 2s → 4s → 8s → 16s → 30s max

---

**Phase 4: Dashboard & Detail Views is done (tasks 4.1 – 4.5). 109 tests passing.**

#### 4.1 — Dashboard view
- `public/src/views/dashboard.js` — portfolio summary (total USD, weighted 24h change, SOL balance); virtual 6-item token list; settings button
- Pollers: prices at configurable interval (default 10s), balances every 30s, TPS every 15s — all pause via `createPoller`'s `visibilitychange` handler
- Custom `keydown` handler on the view container intercepts ArrowUp/Down on token items, manages scroll window, calls `e.stopPropagation()` before global handler
- WS connected once per wallet address (`_wsAddress` guard prevents redundant reconnects)
- `sv:prices-updated` CustomEvent dispatched after each successful price fetch (consumed by detail view)

#### 4.2 — Token item component
- `public/src/components/token-item.js` — `createTokenItem(data)` / `updateTokenItem(el, data)`
- In-place DOM update via `innerHTML` re-fill — no node recreation, no flicker
- Layout: colored circle icon | symbol + name / price + change | USD value + holdings

#### 4.3 — Token detail view
- `public/src/views/detail.js` — large price (text-3xl) + 24h change, sparkline, 2×2 stats grid (24h high, 24h low, holdings, USD value)
- Back button → `navigateBack()`; dashboard restores focus to `_focusedIdx` on re-mount
- Listens for `sv:prices-updated` while mounted; cleans up listener in `unmount`

#### 4.4 — Sparkline component
- `public/src/components/sparkline.js` — `createSparkline(container, opts)` → `{ update(points), destroy() }`
- 2× DPR canvas (`canvas.width = cssW * 2`); coordinates scaled by 2 for the CSS dot position
- Gradient fill (line color → transparent); pulsing `.sparkline-dot` CSS div overlay animated with `@keyframes dot-pulse`
- RAF-gated redraws; green (`#00FFA3`) if last ≥ first, red (`#FF4757`) otherwise

#### 4.5 — Notification component
- `public/src/components/notification.js` — `pushNotification(type, text)` / `initNotifications()`
- FIFO queue; only one `.notif-banner` visible at a time; slides in from top of `#app-main` via CSS transform transition; auto-dismisses after 4s
- `#app-notifications` is `position:absolute; z-index:100; pointer-events:none` — never steals focus

---

**Phase 5: Settings & Configuration is done (tasks 5.1 – 5.2). 109 tests passing.**

#### 5.1 — Settings view
- `public/src/views/settings.js` — mode-based view (`_mode`: menu / rpc / about / alerts-list / alerts-token / alerts-config)
- 9 menu items: Active Wallet, Network, RPC Endpoint, Price Refresh, Currency, Token Filter, Price Alerts, Import Wallet, About
- `dispatch(key, value)` emits `sv:settings-changed` CustomEvent; dashboard listens to update pollers and reconnect WS
- RPC submenu overlay: Public / Helius / QuickNode; About overlay: version + build date
- Token filter (All / Non-zero) and currency cycle (USD/EUR/GBP/NGN) update without reload

#### 5.2 — Price alerts
- `public/src/utils/alerts.js` — `checkPriceAlerts(prices)` checks all non-triggered alerts; fires `pushNotification` on threshold cross; marks alert `triggered: true` (single-use)
- Alert config flow: alerts list → token picker (15 tokens, 8-item virtual window) → direction toggle (above/below) → threshold stepper
- Stepper: ArrowUp/Down adjusts value by current step; ArrowLeft/Right changes step size; `calcStep(price)` computes sensible default step as `10^(floor(log10(price)) - 1)`
- Up to 10 alerts in `sv_price_alerts`; delete from list via a dedicated del button per alert row

---

**Phase 6: Polish & Optimization is done (tasks 6.1 – 6.5).**

#### 6.1 — Boot loader
- `#boot-loader` div in `public/index.html` — spinning `.boot-ring` + `.boot-brand` + `.boot-text`; visible by default, fades out via `boot-out` CSS class + `transitionend` listener
- `boot()` in `app.js` is async; waits for `sv:boot-complete` CustomEvent OR 5s timeout before calling `hideBootLoader()`
- Dashboard dispatches `sv:boot-complete` after the first successful `_fetchAll()` + `_fetchPrices()` chain; guarded by `_bootFired` flag
- No-wallet path: skips loader immediately and navigates to import view

#### 6.2 — Error states & offline handling
- Stale indicator: `_updatePortfolio()` checks `sv_price_cache.timestamp`; shows `⏱ Stale` span in portfolio meta row when cache is older than 60s
- Offline/online: `window.addEventListener('offline'/'online', ...)` in `app.js` calls `setOfflineState(offline)` on status bar; shows `<span class="offline-label">Offline</span>` in place of TPS display; restores TPS slot on reconnect
- No-wallet guard in `dashboard.js _mount`: immediately redirects to import if `_getActiveAddress()` returns null

#### 6.3 — Performance
- Bundle: 38.5KB gzipped (well under 80KB budget)
- localStorage worst case: ~11.7KB (15 tokens × 30 history points × 20B + cache + wallets + alerts + 1KB misc)

#### 6.4 — MRBD compliance
- `scripts/validate-mrbd.js` — static analysis script: HTML viewport, CSS overflow rules, font size tokens, JS input patterns (no scroll/touch/mouse events), icons, manifest, gzip bundle size, localStorage estimate
- 35/35 checks passing: `MRBD compliance: PASS ✓`

#### 6.5 — Deployment & sharing
- `README.md` written with: feature overview, platform constraints table, tech stack, project structure, dev setup, all three wallet import methods, Vercel deployment guide, env vars, KV store setup, deep link / QR sharing instructions, configuration table, test commands, architecture notes
- Deep link format: `https://<deployment>/?addr=<BASE58_ADDRESS>` — consumed on boot, URL param cleared immediately

### Current State

All 6 phases complete. 109 tests passing. 35/35 MRBD compliance checks passing. Ready for production deploy (`vercel --prod`) and on-device testing.

---

## Session Summary (2026-05-26)

### Infrastructure & Deployment Fixes

#### Vercel deployment errors resolved
- Removed invalid `"functions": { "api/**/*.js": { "runtime": "edge" } }` block from `vercel.json`; runtime is declared via `export const config = { runtime: 'edge' }` in each Edge Function file instead
- Fixed SPA rewrite to exclude `setup.html`, `icons/`, and `manifest.webmanifest` from being rewritten to `index.html`
- Pairing API migrated from `@vercel/kv` to direct Upstash Redis REST API calls (`KV_REST_API_URL` / `KV_REST_API_TOKEN`); returns JSON 503 (not HTML crash) when KV not configured
- Removed `@vercel/kv` from `package.json`

#### Helius RPC proxy (`api/rpc.js`)
- New Edge Function that injects `HELIUS_API_KEY` server-side; never exposes the key to the client
- `GET /api/rpc` → returns `{ wss: "wss://mainnet.helius-rpc.com/?api-key=..." }` for WebSocket connections
- `POST /api/rpc` → proxies JSON-RPC calls to `https://mainnet.helius-rpc.com/?api-key=...`
- `RPC_ENDPOINTS.HELIUS_PROXY = '/api/rpc'` added to `constants.js`
- `websocket.js` `getWsUrl()` made async; fetches WSS URL from `GET /api/rpc` when Helius proxy active; caches in module-level `_heliusWssUrl`

#### Devnet removed
- `STORAGE_KEYS.NETWORK`, `DEFAULTS.NETWORK`, `RPC_ENDPOINTS.DEVNET_PUBLIC` removed from `constants.js`
- Network menu item removed from settings
- `updateNetworkStatus` export removed from `header.js` (network dot now always shows Mainnet green)
- Boot migration: removes `sv_network` from localStorage and resets any devnet RPC endpoint to `HELIUS_PROXY`

### UI Redesign

#### Token logo images
- Added `logoURI` to all 15 `TOKEN_REGISTRY` entries using verified CDN URLs:
  - SOL, USDC, RAY, mSOL, bSOL, ETH (Wormhole), WBTC, ORCA → `cdn.jsdelivr.net/gh/solana-labs/token-list`
  - USDT → `raw.githubusercontent.com` SVG
  - JUP → `static.jup.ag`; BONK → `arweave.net`; WIF → `ipfs.nftstorage.link`
  - JTO → `metadata.jito.network`; PYTH → `pyth.network`; RNDR → `assets.coingecko.com`
- `token-item.js` renders a gradient circle background (token color) with a letter fallback; `<img>` loads on top and hides itself on `onerror`

#### Dashboard redesign
- Portfolio section: `PORTFOLIO VALUE` label, truncated wallet address, total USD + ▲/▼ weighted 24h change, SOL balance line (`X SOL ≈ $Y`)
- Token list header: `TOKENS` label + pulsing `LIVE` dot + ⚙ settings button
- Token rows: 40px gradient icon circle, symbol/holdings sub-label, price + ▲/▼ change, USD value
- Token item focus: glowing cyan border + box-shadow (distinct from generic `.focusable` glow)
- `▲`/`▼` triangle change indicators throughout (replaces `+`/`-` prefix)

#### Header cleanup
- Removed `• MAINNET` network indicator; header now shows brand (left) and clock (right) only

### New Features

#### Trending token alerts (`public/src/services/trending.js`)
New service with two alert types, both controlled by Settings → Trending Alerts:

**Price-action alerts (known tokens)**
- `checkTrendingAlerts(threshold, timeframe)` — checks all 15 TOKEN_REGISTRY tokens via `GET https://api.dexscreener.com/latest/dex/tokens/{mints}`
- Picks highest-volume Solana pair per token; fires if `|changeH1|` or `|changeH24|` exceeds threshold
- Notification: `◉ SOL ▲ 12.3% · 24h`

**Trending discovery (new tokens)**
- `checkTrendingDiscovery(threshold, timeframe)` — two-step DexScreener call:
  1. `GET https://api.dexscreener.com/token-boosts/top/v1` → top 10 Solana-chain boosted token addresses not in TOKEN_REGISTRY
  2. `GET https://api.dexscreener.com/latest/dex/tokens/{addresses}` → price data for those tokens
- Fires for tokens with significant moves outside the known registry
- Notification: `◉ MYRO ▲ 83.1% · Trending`

**Shared mechanics**
- Module-level `_alerted` Set prevents re-alerting the same token within a session
- `resetTrendingAlerted()` clears dedup state when user changes settings
- Poller runs every 5 minutes; both checks run each cycle; starts immediately on `start()`
- `'trending'` type added to `notification.js _iconFor` → renders `◉` icon

#### Trending alerts settings (Settings → Trending Alerts)
- New `_mode = 'trending'` in `settings.js`; submenu overlay with three controls:
  - **Enabled**: ON/OFF toggle (cyan when on, dim when off)
  - **Threshold**: cycles 5% → 10% → 20% → 50% (dimmed when disabled)
  - **Timeframe**: toggles 1h / 24h (dimmed when disabled)
- Saves immediately on each click; focus restored to the clicked button after re-render
- `STORAGE_KEYS.TRENDING_ALERTS = 'sv_trending_alerts'` and `DEFAULTS.TRENDING_ALERTS = { enabled: false, threshold: 10, timeframe: 'h24' }` added to `constants.js`
- Dashboard `_settingsHandler` handles `STORAGE_KEYS.TRENDING_ALERTS`: resets dedup, starts/stops poller

### Current State

All 6 phases complete plus trending alerts feature. 109 tests passing. Deployed at `https://solvision-one.vercel.app`. Helius RPC proxy active (API key server-side). Pairing via Upstash Redis KV.
