# SolVision

Real-time Solana portfolio HUD for the Meta Ray-Ban Display (MRBD) smart glasses. Renders wallet balances, live token prices, and transaction notifications as a transparent overlay on the additive waveguide display.

## Features

- **Portfolio overview** — total USD value, weighted 24h change, SOL balance
- **Token list** — up to 15 tokens with live prices, 24h change, and USD value; gradient icon art with real token logos
- **Token detail** — sparkline chart, 24h high/low, full holdings breakdown
- **Price alerts** — single-use threshold alerts (above/below) per token
- **Trending alerts** — auto-detects Solana tokens with significant price action; also discovers new trending tokens outside your portfolio via DexScreener
- **Multi-wallet** — store up to 5 wallets, switch instantly
- **Settings** — RPC endpoint, refresh rate, currency, token filter, price alerts, trending alerts
- **Boot loader** — animated spinner with graceful 5s timeout fallback
- **Offline state** — status bar shows "Offline"; recovers automatically on reconnect
- **Stale indicator** — ⏱ shown when price cache is older than 60 seconds

## Platform

Built exclusively for MRBD (Meta Ray-Ban Display). Constraints:

| Constraint | Value |
|---|---|
| Viewport | Fixed 600×600px, no scrolling |
| Input | ArrowUp/Down/Left/Right + Enter only |
| Display | Additive waveguide — black pixels are transparent |
| Font | JetBrains Mono, minimum 16px |
| Bundle | < 80KB gzipped |

## Tech Stack

- **Vanilla HTML/CSS/JS** — no framework, no bundler, ES modules only
- **Solana JSON-RPC** via Helius proxy (primary) / public (fallback)
- **Jupiter Price API v2** — batch price fetches with CoinGecko fallback
- **Solana WebSocket** — real-time balance and transaction monitoring
- **DexScreener API** — trending token discovery and price-action alerts
- **Vercel** — static hosting + Edge Functions for the pairing and RPC proxy APIs
- **Upstash Redis** — ephemeral pairing codes (10-min TTL)

## Project Structure

```
solvision/
├── public/               # Everything served to the glasses browser
│   ├── index.html        # App entry point
│   ├── setup.html        # Companion page (phone/desktop wallet pairing)
│   ├── manifest.webmanifest
│   ├── icons/
│   └── src/
│       ├── app.js        # Boot, router, global keydown handler
│       ├── views/        # dashboard, detail, settings, import-wallet, manage-wallets
│       ├── components/   # header, status-bar, token-item, sparkline, notification, char-selector
│       ├── services/     # rpc, prices, websocket, pairing, storage, trending
│       ├── utils/        # format, base58, polling, alerts
│       └── styles/       # variables, base, components, focus
├── api/
│   ├── rpc.js            # Helius RPC proxy — injects API key server-side (Edge Function)
│   ├── pair/index.js     # POST/GET pairing code API (Edge Function)
│   └── health.js
├── scripts/
│   └── validate-mrbd.js  # Static MRBD compliance checker
└── tests/                # Vitest unit tests (109 tests)
```

## Local Development

```bash
# Install dev dependencies (vitest only)
npm install

# Start dev server at localhost:3000
npx serve public -l 3000

# Run unit tests
npx vitest run

# Run MRBD compliance check (static analysis — no browser needed)
node scripts/validate-mrbd.js
```

Open `http://localhost:3000` in a 600×600 browser window (or set DevTools to 600×600 mobile).

## Wallet Import Methods

Three ways to add a wallet to SolVision on the glasses:

### 1. Pairing Code (recommended)

1. Open `https://your-deployment.vercel.app/setup.html` on your phone
2. Paste your Solana wallet address → get a 6-character code
3. On the glasses: Settings → Import Wallet → Enter Pairing Code → type the 6 chars with arrow keys

### 2. Deep Link

Append `?addr=<BASE58_ADDRESS>` to the app URL. The app consumes the address on boot and clears the URL parameter.

```
https://your-deployment.vercel.app/?addr=YourWalletAddressHere
```

### 3. Manual Entry

On the glasses: Settings → Import Wallet → Enter Address Manually → use arrow keys to navigate the 44-slot Base58 character selector.

## Deployment

### Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
- Vercel account linked to the GitHub repo (auto-deploys on push to `main`)

### Deploy

```bash
vercel --prod
```

Or push to `main` — Vercel will auto-deploy via the GitHub integration.

### Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `HELIUS_API_KEY` | Helius RPC key — injected server-side by `api/rpc.js` | Recommended |
| `KV_REST_API_URL` | Upstash Redis REST URL for pairing codes | Required for pairing |
| `KV_REST_API_TOKEN` | Upstash Redis REST token | Required for pairing |

Without `HELIUS_API_KEY` the app falls back to the public Solana RPC (rate-limited). Without the KV vars the pairing API returns a 503 and the other two import methods (deep link, manual entry) still work.

### Upstash KV Setup

The pairing API requires an Upstash Redis database:

1. Create a database at [upstash.com](https://upstash.com) (free tier is sufficient)
2. Copy the REST URL and token from the Upstash console
3. Add `KV_REST_API_URL` and `KV_REST_API_TOKEN` to Vercel project environment variables

### Helius RPC Proxy

`api/rpc.js` is an Edge Function that sits between the glasses app and Helius — the API key never reaches the client. The client calls `/api/rpc` for both HTTP JSON-RPC (POST) and to retrieve the WebSocket URL (GET). Switch to Helius in Settings → RPC Endpoint.

## Sharing with Other MRBD Users

Generate a deep link:

```
https://your-deployment.vercel.app/?addr=<WALLET_ADDRESS>
```

Or use the companion setup page at `/setup.html` to generate a one-time pairing code they enter on their glasses.

For a QR code, encode the deep link URL with any QR generator (e.g., `qrencode -o solvision.png 'https://...'`).

## Configuration

All settings persist to `localStorage`. Change via the Settings view on the glasses:

| Setting | Options | Default |
|---|---|---|
| RPC Endpoint | Public / Helius / QuickNode | Public |
| Price Refresh | 5s / 10s / 30s / 60s | 10s |
| Currency | USD / EUR / GBP / NGN | USD |
| Token Filter | All / Non-zero only | All |
| Price Alerts | Per-token threshold (above/below), up to 10 | — |
| Trending Alerts | Enabled toggle + Threshold (5/10/20/50%) + Timeframe (1h/24h) | Off |

### Trending Alerts

When enabled, a poller fires every 5 minutes and runs two checks:

1. **Known tokens** — checks all 15 TOKEN_REGISTRY tokens (SOL, USDC, BONK, JUP, etc.) via DexScreener for moves beyond the configured threshold. Notification: `◉ SOL ▲ 12.3% · 24h`

2. **Trending discovery** — fetches the top DexScreener-boosted Solana tokens, filters for tokens *not* in your registry, and checks their price action. Notification: `◉ MYRO ▲ 83.1% · Trending`

Each token only fires once per session. Changing the threshold or timeframe resets the dedup state.

## Testing

```bash
npx vitest run
```

109 unit tests across format utilities, Base58 validation, storage, char-selector, RPC client, price client, and polling manager.

```bash
node scripts/validate-mrbd.js
```

35 static checks: HTML viewport meta, CSS overflow rules, font sizes, JS input handling patterns, icons, manifest, bundle size (38.5KB gzipped), localStorage budget (~11.7KB).

## Architecture Notes

**No build step.** JS ships as raw ES modules. The browser handles `import`/`export` natively. This keeps the bundle tiny and removes tooling from the critical path.

**Helius API key stays server-side.** The `api/rpc.js` Edge Function injects the key at the proxy layer. The client only ever talks to `/api/rpc`.

**Focus management is the UI.** Every interactive element has `class="focusable" tabindex="0"`. The global `keydown` handler in `app.js` moves focus through `.focusable` elements in the active view. View-local handlers (dashboard token list, char-selector) call `e.stopPropagation()` to intercept arrow keys before the global handler.

**Views are not destroyed between navigations.** `render()` rebuilds the DOM; `mount()` sets up listeners and starts pollers; `unmount()` removes listeners and stops pollers. The view container (`#view-*`) is always present in the DOM — only `display` toggles.

**All pollers pause when the document is hidden** (glasses app backgrounded) via the `visibilitychange` listener in `polling.js`. This preserves battery on the glasses.

## License

MIT
