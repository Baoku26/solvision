export const config = { runtime: 'edge' };

const HELIUS_HTTP = 'https://mainnet.helius-rpc.com';
const HELIUS_WSS  = 'wss://mainnet.helius-rpc.com';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

export default async function handler(req) {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Helius API key not configured' }),
      { status: 503, headers: CORS }
    );
  }

  // GET — return WSS URL for WebSocket connections
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ wss: `${HELIUS_WSS}/?api-key=${apiKey}` }),
      { headers: CORS }
    );
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });
  }

  try {
    const body = await req.text();
    const res  = await fetch(`${HELIUS_HTTP}/?api-key=${apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data = await res.text();
    return new Response(data, { status: res.status, headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 502, headers: CORS });
  }
}
