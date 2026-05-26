# SolVision

Real-time Solana portfolio HUD for the Meta Ray-Ban Display (MRBD) smart glasses. Renders wallet balances, live token prices, and transaction notifications as a transparent overlay on the additive waveguide display.

![SolVision boot screen](docs/screenshot.png)

## Features

- **Portfolio overview** — total USD value, weighted 24h change, SOL balance
- **Token list** — up to 15 tokens with live prices, 24h change, and USD value
- **Token detail** — sparkline chart, 24h high/low, full holdings breakdown
- **Price alerts** — single-use threshold alerts (above/below) per token
- **Multi-wallet** — store up to 5 wallets, switch instantly
- **Settings** — network (Mainnet/Devnet), RPC endpoint, refresh rate, currency, token filter
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
- **Solana JSON-RPC** via Helius (primary) / QuickNode (fallback) / public (last resort)
- **Jupiter Price API v2** — batch price fetches with CoinGecko fallback
- **Solana WebSocket** — real-time balance and transaction monitoring
- **Vercel** — static hosting + Edge Functions for the pairing API
- **Vercel KV** — ephemeral pairing codes (10-min TTL)

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
│       ├── services/     # rpc, prices, websocket, pairing, storage
│       ├── utils/        # format, base58, polling, alerts
│       └── styles/       # variables, base, components, focus
├── api/
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
- Vercel account with KV store enabled (for pairing API)

### Deploy

```bash
vercel --prod
```

### Environment Variables (optional)

| Variable | Purpose |
|---|---|
| `HELIUS_API_KEY` | Helius RPC key for better rate limits |
| `QUICKNODE_URL` | QuickNode RPC endpoint as fallback |

Without these, the app falls back to the public Solana RPC (rate-limited).

### KV Store

The pairing API (`api/pair/`) requires a Vercel KV database. Create one in the Vercel dashboard and link it to the project — no configuration needed beyond that.

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
| Network | Mainnet / Devnet | Mainnet |
| RPC Endpoint | Public / Helius / QuickNode | Public |
| Price Refresh | 5s / 10s / 30s / 60s | 10s |
| Currency | USD / EUR / GBP / NGN | USD |
| Token Filter | All / Non-zero only | All |

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

**Focus management is the UI.** Every interactive element has `class="focusable" tabindex="0"`. The global `keydown` handler in `app.js` moves focus through `.focusable` elements in the active view. View-local handlers (dashboard token list, char-selector) call `e.stopPropagation()` to intercept arrow keys before the global handler.

**Views are not destroyed between navigations.** `render()` rebuilds the DOM; `mount()` sets up listeners and starts pollers; `unmount()` removes listeners and stops pollers. The view container (`#view-*`) is always present in the DOM — only `display` toggles.

**All pollers pause when the document is hidden** (glasses app backgrounded) via the `visibilitychange` listener in `polling.js`. This preserves battery on the glasses.

## License

MIT
