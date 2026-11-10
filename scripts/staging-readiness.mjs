import { setTimeout } from 'node:timers/promises';

const answerWithin = 5000;
const attempts = 5;
const pause = 1000;
const failedAttempt = {
  timeout: `timed out after ${answerWithin} ms`,
  unavailable: 'returned HTTP 503',
};

// The abort signal ends a request that got no answer in time with an error of
// this name, whether the headers or the body were late.
const timedOut = (error) => error?.name === 'TimeoutError';

// An uncached GET that follows no redirect and gives up after five seconds,
// body included. It answers the status and, for a 200, the JSON body. A
// request is recorded once its body has arrived, with its path, its HTTP
// status and the time it took, or as `timeout`, so a late body never counts
// as a fast answer.
export async function timedGet(fetcher, url, path, measurements) {
  const started = performance.now();
  const record = (status) =>
    measurements.push({ path, status, ms: Math.round(performance.now() - started) });
  try {
    const response = await fetcher(`${url}${path}`, {
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(answerWithin),
    });
    if (response.status !== 200) {
      await response.arrayBuffer();
      record(response.status);
      return { status: response.status };
    }
    const body = await response.json();
    record(200);
    return { status: 200, body };
  } catch (error) {
    if (timedOut(error)) record('timeout');
    throw error;
  }
}

// One readiness request. A 503 (the database waking up, or the service gate
// closed) and a request without an answer in time, as a cold start of the
// hosted function can take several seconds, are worth another try; any other
// answer ends the wait.
async function probe(fetcher, url, measurements) {
  try {
    const { status, body } = await timedGet(fetcher, url, '/health/ready', measurements);
    if (status === 200) {
      if (body?.status !== 'ready') throw new Error('Invalid database readiness response');
      return 'ready';
    }
    if (status !== 503) throw new Error(`Staging readiness failed (HTTP ${status})`);
    return 'unavailable';
  } catch (error) {
    if (timedOut(error)) return 'timeout';
    throw error;
  }
}

function describe(outcomes) {
  const parts = Object.entries(failedAttempt)
    .map(([outcome, text]) => [outcomes.filter((seen) => seen === outcome).length, text])
    .filter(([count]) => count > 0)
    .map(([count, text]) => `${count} ${text}`);
  return `Staging was not ready after ${attempts} attempts: ${parts.join(', ')}`;
}

// Readiness before a release and in the health alert: up to five requests one
// second apart. The error says how many attempts timed out and how many
// returned 503, so a slow cold start reads differently from a closed database.
export async function waitForReadiness(
  url,
  measurements,
  { fetcher = fetch, wait = setTimeout } = {},
) {
  const outcomes = [];
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const outcome = await probe(fetcher, url, measurements);
    if (outcome === 'ready') return;
    outcomes.push(outcome);
    if (attempt < attempts) await wait(pause);
  }
  throw new Error(describe(outcomes));
}
