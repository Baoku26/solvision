export const config = { runtime: 'edge' };

export default function handler() {
  const keys = Object.keys(process.env)
    .filter(k => k.includes('UPSTASH') || k.includes('KV') || k.includes('REDIS'));
  return new Response(JSON.stringify({ keys }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
