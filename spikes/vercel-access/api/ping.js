import Fastify from 'fastify';

const app = Fastify({ logger: false });
app.get('/api/ping', () => ({
  ok: true,
  probe: 'education-access-v1',
  framework: 'fastify',
  region: process.env.VERCEL_REGION ?? 'local',
  time: new Date().toISOString(),
}));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.writeHead(405);
    res.end();
    return;
  }
  const result = await app.inject({ method: req.method, url: '/api/ping' });
  res.writeHead(result.statusCode, result.headers);
  res.end(result.body);
}
