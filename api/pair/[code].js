const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function upstash() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
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
    get: (key) => cmd('GET', key),
    del: (key) => cmd('DEL', key),
  };
}

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const kv = upstash();
  if (!kv) {
    return json({ error: 'KV store not configured — connect an Upstash Redis database in the Vercel dashboard' }, 503);
  }

  const url  = new URL(req.url);
  const code = url.pathname.split('/').pop();

  if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
    return json({ error: 'Invalid code format' }, 400);
  }

  const kvKey = `pair:${code}`;

  if (req.method === 'GET') {
    const address = await kv.get(kvKey);
    if (!address) return json({ error: 'Code not found or expired' }, 404);
    await kv.del(kvKey);
    return json({ address });
  }

  if (req.method === 'DELETE') {
    await kv.del(kvKey);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}
