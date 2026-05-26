const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function isValidAddress(str) {
  return typeof str === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str);
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

function upstash() {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  async function cmd(...args) {
    const res = await fetch(`${url}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    const { result } = await res.json();
    return result;
  }

  return {
    incr:   (key)           => cmd('INCR', key),
    expire: (key, secs)     => cmd('EXPIRE', key, secs),
    set:    (key, val, ex)  => cmd('SET', key, val, 'EX', ex),
    get:    (key)           => cmd('GET', key),
    del:    (key)           => cmd('DEL', key),
  };
}

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const kv = upstash();
  if (!kv) {
    return json({ error: 'KV store not configured — connect an Upstash Redis database in the Vercel dashboard' }, 503);
  }

  // Rate limit: 5 POSTs per IP per minute
  const ip    = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rlKey = `rl:${ip}`;
  const count = await kv.incr(rlKey);
  if (count === 1) await kv.expire(rlKey, 60);
  if (count > 5) return json({ error: 'Rate limit exceeded' }, 429);

  let body;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  if (!isValidAddress(body?.address)) {
    return json({ error: 'Invalid Solana address' }, 400);
  }

  const code = generateCode();
  await kv.set(`pair:${code}`, body.address, 600);

  return json({ code });
}
