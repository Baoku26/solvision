import { describe, it, expect } from 'vitest';
import { formatPrice, formatHoldings, formatCompact, truncateAddress } from '../public/src/utils/format.js';

describe('formatPrice', () => {
  it('formats zero', () => expect(formatPrice(0)).toBe('$0.00'));
  it('handles null', () => expect(formatPrice(null)).toBe('$0.00'));
  it('handles undefined', () => expect(formatPrice(undefined)).toBe('$0.00'));
  it('handles NaN', () => expect(formatPrice(NaN)).toBe('$0.00'));

  it('formats price >= 1000 with commas', () => expect(formatPrice(67000)).toBe('$67,000.00'));
  it('formats price >= 1', () => expect(formatPrice(150.45)).toBe('$150.45'));
  it('formats price >= 0.01', () => expect(formatPrice(0.0523)).toBe('$0.0523'));
  it('formats price >= 0.0001', () => expect(formatPrice(0.000523)).toBe('$0.000523'));
  it('formats very small price', () => expect(formatPrice(0.00000001)).toBe('$0.00000001'));

  it('handles negative price', () => expect(formatPrice(-5.5)).toBe('-$5.50'));
  it('formats million-dollar price', () => expect(formatPrice(1000000)).toBe('$1,000,000.00'));
});

describe('formatHoldings', () => {
  it('formats zero holdings', () => expect(formatHoldings(0, 'SOL')).toBe('0.00 SOL'));
  it('formats zero holdings with correct symbol', () => expect(formatHoldings(0, 'USDC')).toBe('0.00 USDC'));
  it('handles null', () => expect(formatHoldings(null, 'SOL')).toBe('0 SOL'));
  it('handles NaN', () => expect(formatHoldings(NaN, 'SOL')).toBe('0 SOL'));

  it('formats large holding in billions', () => {
    expect(formatHoldings(2500000000, 'BONK')).toBe('2.50B BONK');
  });
  it('formats millions with commas', () => {
    expect(formatHoldings(1234567.89, 'BONK')).toBe('1,234,567.89 BONK');
  });
  it('formats sub-unit holding to 6 decimals', () => {
    expect(formatHoldings(0.00012345, 'SOL')).toBe('0.000123 SOL');
  });
  it('includes symbol', () => {
    expect(formatHoldings(1.5, 'USDC')).toContain('USDC');
  });
});

describe('formatCompact', () => {
  it('formats zero', () => expect(formatCompact(0)).toBe('0'));
  it('handles null', () => expect(formatCompact(null)).toBe('0'));
  it('handles NaN', () => expect(formatCompact(NaN)).toBe('0'));

  it('formats trillions', () => expect(formatCompact(1.5e12)).toBe('1.5T'));
  it('formats billions', () => expect(formatCompact(3.4e9)).toBe('3.4B'));
  it('formats millions', () => expect(formatCompact(3456789)).toBe('3.5M'));
  it('formats thousands', () => expect(formatCompact(4321)).toBe('4.3K'));
  it('formats small number as-is', () => expect(formatCompact(42)).toBe('42'));
  it('formats negative', () => expect(formatCompact(-1500)).toBe('-1.5K'));
});

describe('truncateAddress', () => {
  it('truncates a long address', () => {
    expect(truncateAddress('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM')).toBe('9WzD...AWWM');
  });
  it('returns short address unchanged', () => {
    expect(truncateAddress('abc')).toBe('abc');
  });
  it('handles null', () => expect(truncateAddress(null)).toBe(''));
  it('handles empty string', () => expect(truncateAddress('')).toBe(''));
  it('handles non-string', () => expect(truncateAddress(123)).toBe(''));
});
