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

### Up Next

Phase 1: Navigation & View System (tasks 1.1 – 1.4)
- D-pad input handler (`ArrowUp/Down/Left/Right`, `Enter`, `Escape`)
- View router (`navigateTo`, `navigateBack`, view register/mount/unmount lifecycle)
- Header component (brand, network indicator, live clock)
- Status bar component (nav hints, TPS counter)
