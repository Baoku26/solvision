export const STORAGE_KEYS = {
  WALLETS:          'sv_wallets',
  ACTIVE_WALLET:    'sv_active_wallet',
  RPC_ENDPOINT:     'sv_rpc_endpoint',
  NETWORK:          'sv_network',
  REFRESH_INTERVAL: 'sv_refresh_interval',
  CURRENCY:         'sv_currency',
  TOKEN_FILTER:     'sv_token_filter',
  PRICE_CACHE:      'sv_price_cache',
  PRICE_HISTORY:    'sv_price_history',
  PRICE_ALERTS:     'sv_price_alerts',
  DEBUG:            'sv_debug',
};

export const WALLET_MAX = 5;

export const CHARSETS = {
  ALPHANUMERIC: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  BASE58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
};

export const RPC_ENDPOINTS = {
  MAINNET_PUBLIC: 'https://api.mainnet-beta.solana.com',
  DEVNET_PUBLIC:  'https://api.devnet.solana.com',
};

export const DEFAULTS = {
  NETWORK:          'mainnet-beta',
  REFRESH_INTERVAL: 10_000,
  CURRENCY:         'USD',
  TOKEN_FILTER:     'all',
};

// ── Token registry ─────────────────────────────────────────────
// Hardcoded metadata for the top Solana tokens.
// Mint addresses sourced from Solana token-list / official project sites.
export const TOKEN_REGISTRY = {
  // Wrapped SOL (used by Jupiter for SOL price lookups)
  'So11111111111111111111111111111111111111112': {
    symbol: 'SOL', name: 'Solana',
    color: '#9945FF', coingeckoId: 'solana',
  },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
    symbol: 'USDC', name: 'USD Coin',
    color: '#2775CA', coingeckoId: 'usd-coin',
  },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
    symbol: 'USDT', name: 'Tether',
    color: '#26A17B', coingeckoId: 'tether',
  },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': {
    symbol: 'JUP', name: 'Jupiter',
    color: '#C7A42F', coingeckoId: 'jupiter-exchange-solana',
  },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': {
    symbol: 'RAY', name: 'Raydium',
    color: '#5AC4BE', coingeckoId: 'raydium',
  },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': {
    symbol: 'BONK', name: 'Bonk',
    color: '#F48624', coingeckoId: 'bonk',
  },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': {
    symbol: 'WIF', name: 'dogwifhat',
    color: '#B45309', coingeckoId: 'dogwifcoin',
  },
  'jtojtomepa8b1duagzj4pekzxjd8ekeqrz3bxcnj7r': {
    symbol: 'JTO', name: 'Jito',
    color: '#17B978', coingeckoId: 'jito-governance-token',
  },
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3P': {
    symbol: 'PYTH', name: 'Pyth Network',
    color: '#6E3FD5', coingeckoId: 'pyth-network',
  },
  'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': {
    symbol: 'RNDR', name: 'Render',
    color: '#E84142', coingeckoId: 'render-token',
  },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': {
    symbol: 'mSOL', name: 'Marinade SOL',
    color: '#05C992', coingeckoId: 'msol',
  },
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': {
    symbol: 'bSOL', name: 'BlazeStake SOL',
    color: '#FF6B35', coingeckoId: 'blazestake-staked-sol',
  },
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': {
    symbol: 'ETH', name: 'Ethereum (Wormhole)',
    color: '#627EEA', coingeckoId: 'ethereum',
  },
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh': {
    symbol: 'WBTC', name: 'Wrapped Bitcoin',
    color: '#F7931A', coingeckoId: 'wrapped-bitcoin',
  },
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': {
    symbol: 'ORCA', name: 'Orca',
    color: '#FBCE00', coingeckoId: 'orca',
  },
};

/**
 * Returns metadata for a given mint address.
 * Falls back to a derived stub for unknown tokens.
 */
export function getTokenMeta(mint) {
  return TOKEN_REGISTRY[mint] || {
    symbol: '???',
    name: `${String(mint).slice(0, 4)}…${String(mint).slice(-4)}`,
    color: '#444444',
    coingeckoId: null,
  };
}
