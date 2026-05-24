import { kv } from '@vercel/kv';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url = new URL(req.url);
  const code = url.pathname.split('/').pop();

  if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
    return json({ error: 'Invalid code format' }, 400);
  }

  const kvKey = `pair:${code}`;

  if (req.method === 'GET') {
    const address = await kv.get(kvKey);
    if (!address) return json({ error: 'Code not found or expired' }, 404);
    await kv.del(kvKey); // single-use
    return json({ address });
  }

  if (req.method === 'DELETE') {
    await kv.del(kvKey);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}
