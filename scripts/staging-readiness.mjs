import { setTimeout } from 'node:timers/promises';

// An uncached GET that follows no redirect and gives up after five seconds,
// recording its path, status and time.
export async function timedGet(fetcher, url, path, measurements) {
  const started = performance.now();
  const response = await fetcher(`${url}${path}`, {
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  measurements.push({ path, status: response.status, ms: Math.round(performance.now() - started) });
  return response;
}

export async function waitForReadiness(
  url,
  measurements,
  { fetcher = fetch, wait = setTimeout } = {},
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await timedGet(fetcher, url, '/health/ready', measurements);
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
