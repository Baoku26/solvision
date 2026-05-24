/**
 * Format a token price for display on the HUD.
 * Adjusts decimal precision based on magnitude so small-cap tokens
 * show meaningful digits without wasting screen space on large ones.
 */
export function formatPrice(n) {
  if (n == null || isNaN(n)) return '$0.00';

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs === 0) return '$0.00';
  if (abs >= 1000) {
    return sign + '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (abs >= 1)      return sign + '$' + abs.toFixed(2);
  if (abs >= 0.01)   return sign + '$' + abs.toFixed(4);
  if (abs >= 0.0001) return sign + '$' + abs.toFixed(6);
  return sign + '$' + abs.toFixed(8);
}

/**
 * Format a token holding amount with its symbol.
 * e.g. formatHoldings(1234567.89, 'SOL') → '1,234,567.89 SOL'
 */
export function formatHoldings(amount, symbol) {
  if (amount == null || isNaN(amount)) return `0 ${symbol}`;
  if (amount === 0) return `0.00 ${symbol}`;

  const abs = Math.abs(amount);
  let formatted;

  if (abs >= 1e9)         formatted = (amount / 1e9).toFixed(2) + 'B';
  else if (abs >= 1e6)    formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  else if (abs >= 1)      formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  else if (abs >= 0.0001) formatted = amount.toFixed(6);
  else                    formatted = amount.toFixed(8);

  return `${formatted} ${symbol}`;
}

/**
 * Format a number in compact notation.
 * Used for portfolio totals, TPS, and other large figures.
 * e.g. formatCompact(3456789) → '3.5M'
 */
export function formatCompact(n) {
  if (n == null || isNaN(n)) return '0';

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 1e12) return sign + (abs / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9)  return sign + (abs / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6)  return sign + (abs / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3)  return sign + (abs / 1e3).toFixed(1) + 'K';
  return sign + abs.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Shorten a Solana address for display.
 * e.g. '9WzDXwBb...tAWWM'
 */
export function truncateAddress(addr) {
  if (!addr || typeof addr !== 'string') return '';
  if (addr.length <= 10) return addr;
  return addr.slice(0, 4) + '...' + addr.slice(-4);
}
