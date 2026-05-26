export const config = { runtime: 'edge' };

export default function handler() {
  return new Response(
    JSON.stringify({ ok: true, timestamp: Date.now() }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
