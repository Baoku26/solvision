export const STORAGE_KEYS = {
  WALLETS:          'sv_wallets',
  ACTIVE_WALLET:    'sv_active_wallet',
  RPC_ENDPOINT:     'sv_rpc_endpoint',
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
};

export const DEFAULTS = {
  REFRESH_INTERVAL: 10_000,
  CURRENCY:         'USD',
  TOKEN_FILTER:     'all',
};

// ── Token registry ─────────────────────────────────────────────
// Hardcoded metadata for the top Solana tokens.
// Mint addresses sourced from Solana token-list / official project sites.
const _jsl = m => `https://cdn.jsdelivr.net/gh/solana-labs/token-list/assets/mainnet/${m}/logo.png`;

export const TOKEN_REGISTRY = {
  'So11111111111111111111111111111111111111112': {
    symbol: 'SOL', name: 'Solana',
    color: '#9945FF', coingeckoId: 'solana',
    logoURI: _jsl('So11111111111111111111111111111111111111112'),
  },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
    symbol: 'USDC', name: 'USD Coin',
    color: '#2775CA', coingeckoId: 'usd-coin',
    logoURI: _jsl('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
    symbol: 'USDT', name: 'Tether',
    color: '#26A17B', coingeckoId: 'tether',
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
  },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': {
    symbol: 'JUP', name: 'Jupiter',
    color: '#C7A42F', coingeckoId: 'jupiter-exchange-solana',
    logoURI: 'https://static.jup.ag/jup/icon.png',
  },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': {
    symbol: 'RAY', name: 'Raydium',
    color: '#5AC4BE', coingeckoId: 'raydium',
    logoURI: _jsl('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'),
  },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': {
    symbol: 'BONK', name: 'Bonk',
    color: '#F48624', coingeckoId: 'bonk',
    logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
  },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': {
    symbol: 'WIF', name: 'dogwifhat',
    color: '#B45309', coingeckoId: 'dogwifcoin',
    logoURI: 'https://bafkreibk3covs5ltyqxa272uodhculbr6kea6betidfwy3ajsav2vjzyum.ipfs.nftstorage.link',
  },
  'jtojtomepa8b1duagzj4pekzxjd8ekeqrz3bxcnj7r': {
    symbol: 'JTO', name: 'Jito',
    color: '#17B978', coingeckoId: 'jito-governance-token',
    logoURI: 'https://metadata.jito.network/token/jto/image',
  },
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3P': {
    symbol: 'PYTH', name: 'Pyth Network',
    color: '#6E3FD5', coingeckoId: 'pyth-network',
    logoURI: 'https://pyth.network/token.svg',
  },
  'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': {
    symbol: 'RNDR', name: 'Render',
    color: '#E84142', coingeckoId: 'render-token',
    logoURI: 'https://assets.coingecko.com/coins/images/11636/small/rndr.png',
  },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': {
    symbol: 'mSOL', name: 'Marinade SOL',
    color: '#05C992', coingeckoId: 'msol',
    logoURI: _jsl('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'),
  },
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': {
    symbol: 'bSOL', name: 'BlazeStake SOL',
    color: '#FF6B35', coingeckoId: 'blazestake-staked-sol',
    logoURI: _jsl('bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1'),
  },
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': {
    symbol: 'ETH', name: 'Ethereum (Wormhole)',
    color: '#627EEA', coingeckoId: 'ethereum',
    logoURI: _jsl('7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs'),
  },
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh': {
    symbol: 'WBTC', name: 'Wrapped Bitcoin',
    color: '#F7931A', coingeckoId: 'wrapped-bitcoin',
    logoURI: _jsl('3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh'),
  },
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': {
    symbol: 'ORCA', name: 'Orca',
    color: '#FBCE00', coingeckoId: 'orca',
    logoURI: _jsl('orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE'),
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
