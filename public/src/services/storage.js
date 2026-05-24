/**
 * localStorage wrapper with JSON serialization and quota/parse error handling.
 * All functions return null / false on failure rather than throwing.
 */

export function get(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function set(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch {
    // QuotaExceededError or SecurityError
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function clear() {
  try {
    localStorage.clear();
    return true;
  } catch {
    return false;
  }
}
