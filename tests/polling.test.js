// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPoller } from '../public/src/utils/polling.js';

describe('createPoller', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns start, stop, and setInterval', () => {
    const poller = createPoller(() => {}, 1000);
    expect(typeof poller.start).toBe('function');
    expect(typeof poller.stop).toBe('function');
    expect(typeof poller.setInterval).toBe('function');
  });

  it('calls fn immediately on start', () => {
    const fn = vi.fn();
    const poller = createPoller(fn, 1000);
    poller.start();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls fn again after interval elapses', () => {
    const fn = vi.fn();
    const poller = createPoller(fn, 1000);
    poller.start();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('stops polling after stop()', () => {
    const fn = vi.fn();
    const poller = createPoller(fn, 1000);
    poller.start();
    poller.stop();
    vi.advanceTimersByTime(5000);
    expect(fn).toHaveBeenCalledTimes(1); // only the initial call
  });

  it('start() is idempotent — does not double-schedule', () => {
    const fn = vi.fn();
    const poller = createPoller(fn, 1000);
    poller.start();
    poller.start(); // second call should be a no-op
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(2); // initial + 1 tick, not 3
  });

  it('pauses when document becomes hidden', () => {
    const fn = vi.fn();
    const poller = createPoller(fn, 1000);
    poller.start();
    expect(fn).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    vi.advanceTimersByTime(5000);
    expect(fn).toHaveBeenCalledTimes(1); // no additional ticks while hidden
  });

  it('resumes immediately when document becomes visible again', () => {
    const fn = vi.fn();
    const poller = createPoller(fn, 1000);
    poller.start();

    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Should have fired once on start + once on resume
    expect(fn).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
