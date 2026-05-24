export const STORAGE_KEYS = {
  WALLETS:          'sv_wallets',
  ACTIVE_WALLET:    'sv_active_wallet',
  RPC_ENDPOINT:     'sv_rpc_endpoint',
  NETWORK:          'sv_network',
  REFRESH_INTERVAL: 'sv_refresh_interval',
  CURRENCY:         'sv_currency',
  TOKEN_FILTER:     'sv_token_filter',
  PRICE_CACHE:      'sv_price_cache',
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
