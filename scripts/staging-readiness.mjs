import { setTimeout } from 'node:timers/promises';

export async function waitForReadiness(
  url,
  measurements,
  { fetcher = fetch, wait = setTimeout } = {},
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const started = performance.now();
    const response = await fetcher(`${url}/health/ready`, {
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    measurements.push({
      path: '/health/ready',
      status: response.status,
      ms: Math.round(performance.now() - started),
    });
    if (response.status === 200) {
      if ((await response.json()).status !== 'ready')
        throw new Error('Invalid database readiness response');
      return;
    }
    await response.arrayBuffer();
    if (response.status !== 503)
      throw new Error(`Staging readiness failed (HTTP ${response.status})`);
    if (attempt < 4) await wait(1000);
  }
  throw new Error('Database readiness remained unavailable; staging not released');
}
