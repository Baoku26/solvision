/**
 * Creates a self-scheduling poller that calls fn repeatedly at intervalMs.
 * Automatically pauses when the document is hidden (glasses app backgrounded)
 * and resumes when it becomes visible again — conserving RPC quota.
 *
 * Returns { start, stop, setInterval } where setInterval changes the interval
 * without restarting the poller.
 */
export function createPoller(fn, intervalMs) {
  let timerId = null;
  let currentInterval = intervalMs;
  let running = false;

  function tick() {
    fn();
    if (running) {
      timerId = setTimeout(tick, currentInterval);
    }
  }

  function start() {
    if (running) return;
    running = true;
    tick();
  }

  function stop() {
    running = false;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function updateInterval(ms) {
    currentInterval = ms;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    } else if (running) {
      tick();
    }
  });

  return { start, stop, setInterval: updateInterval };
}
