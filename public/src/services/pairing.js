const TIMEOUT_MS = 10_000;

async function apiFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Retrieve the wallet address for a pairing code.
 * Throws on 404 (code not found/expired) or network errors.
 */
export async function getPairingAddress(code) {
  const data = await apiFetch(`/api/pair/${encodeURIComponent(code)}`);
  return data.address;
}
