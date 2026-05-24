// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { get, set, remove, clear } from '../public/src/services/storage.js';

describe('storage', () => {
  beforeEach(() => localStorage.clear());

  it('sets and gets a string value', () => {
    set('key', 'hello');
    expect(get('key')).toBe('hello');
  });

  it('sets and gets an object', () => {
    set('wallet', { address: 'abc123', label: 'Main' });
    expect(get('wallet')).toEqual({ address: 'abc123', label: 'Main' });
  });

  it('sets and gets a number', () => {
    set('count', 42);
    expect(get('count')).toBe(42);
  });

  it('sets and gets an array', () => {
    set('tokens', ['SOL', 'USDC']);
    expect(get('tokens')).toEqual(['SOL', 'USDC']);
  });

  it('returns null for a missing key', () => {
    expect(get('nonexistent')).toBe(null);
  });

  it('removes a key', () => {
    set('temp', 1);
    remove('temp');
    expect(get('temp')).toBe(null);
  });

  it('remove returns true on success', () => {
    set('temp', 1);
    expect(remove('temp')).toBe(true);
  });

  it('clears all keys', () => {
    set('a', 1);
    set('b', 2);
    set('c', 3);
    clear();
    expect(get('a')).toBe(null);
    expect(get('b')).toBe(null);
    expect(get('c')).toBe(null);
  });

  it('handles corrupted JSON gracefully', () => {
    localStorage.setItem('bad', '{not: valid json{{');
    expect(get('bad')).toBe(null);
  });

  it('set returns true on success', () => {
    expect(set('x', 1)).toBe(true);
  });
});
