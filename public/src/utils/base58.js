// Base58 charset used by Solana (Bitcoin Base58: no 0, O, I, l)
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Returns true if str is a plausible Solana wallet address.
 * Checks Base58 character set and byte-length range (32–44 chars).
 * Does not verify the address exists on-chain.
 */
export function isValidSolanaAddress(str) {
  if (typeof str !== 'string') return false;
  return BASE58_RE.test(str);
}
