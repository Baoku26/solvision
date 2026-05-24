import { describe, it, expect } from 'vitest';
import { isValidSolanaAddress } from '../public/src/utils/base58.js';

const VALID_ADDRESS = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'; // 44 chars
const SYSTEM_PROGRAM = '11111111111111111111111111111111'; // 32 chars, all 1s

describe('isValidSolanaAddress', () => {
  it('accepts a 44-char mainnet address', () => {
    expect(isValidSolanaAddress(VALID_ADDRESS)).toBe(true);
  });
  it('accepts the 32-char system program address', () => {
    expect(isValidSolanaAddress(SYSTEM_PROGRAM)).toBe(true);
  });

  it('rejects non-string: null', () => expect(isValidSolanaAddress(null)).toBe(false));
  it('rejects non-string: number', () => expect(isValidSolanaAddress(123)).toBe(false));
  it('rejects non-string: undefined', () => expect(isValidSolanaAddress(undefined)).toBe(false));

  it('rejects empty string', () => expect(isValidSolanaAddress('')).toBe(false));
  it('rejects too short (< 32 chars)', () => expect(isValidSolanaAddress('abc')).toBe(false));
  it('rejects too long (> 44 chars)', () => {
    expect(isValidSolanaAddress('1'.repeat(45))).toBe(false);
  });

  // Invalid Base58 characters
  it('rejects address containing 0 (zero)', () => {
    const bad = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zY0AWWM';
    expect(isValidSolanaAddress(bad)).toBe(false);
  });
  it('rejects address containing O (capital oh)', () => {
    const bad = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYOAWWM';
    expect(isValidSolanaAddress(bad)).toBe(false);
  });
  it('rejects address containing I (capital eye)', () => {
    const bad = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYIAWWM';
    expect(isValidSolanaAddress(bad)).toBe(false);
  });
  it('rejects address containing l (lowercase ell)', () => {
    const bad = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYlAWWM';
    expect(isValidSolanaAddress(bad)).toBe(false);
  });
  it('rejects address with spaces', () => {
    expect(isValidSolanaAddress('9WzDXwBb mkg8ZTbNM quxvQRAyrZ')).toBe(false);
  });
});
