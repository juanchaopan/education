import { randomBytes, randomUUID } from 'node:crypto';
import { waitForReadiness } from './staging-readiness.mjs';

function smokeRequest(url, measurements) {
  return async (path, status, options = {}) => {
    const started = performance.now();
    const response = await fetch(`${url}${path}`, {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
    measurements.push({
      path,
      status: response.status,
      ms: Math.round(performance.now() - started),
    });
    if (response.status !== status)
      throw new Error(`Staging smoke failed: ${path} (HTTP ${response.status})`);
    return response;
  };
}

// The deployment reports the release it was built from, and its page names the
// same release, so open pages compare like with like when they look for an
// update. The version file is never cached; the page is revalidated.
async function checkRelease(request, revision) {
  const version = await request('/version.json', 200);
  if (
    (await version.json()).revision !== revision ||
    version.headers.get('cache-control') !== 'no-store'
  )
    throw new Error('Release identity mismatch');
  const page = await request('/', 200);
  if (
    !(await page.text()).includes(`<meta name="education-release" content="${revision}"`) ||
    page.headers.get('cache-control') !== 'no-cache'
  )
    throw new Error('Page release mismatch');
}

export async function smokeAccount(url, origin, revision, cleanup) {
  const email = `staging-smoke-${randomUUID()}@example.invalid`;
  const password = randomBytes(32).toString('base64url');
  const measurements = [];
  const headers = {
    Origin: origin,
    'Content-Type': 'application/json',
    'X-Education-Request': 'session',
  };
  const request = smokeRequest(url, measurements);
  try {
    await checkRelease(request, revision);
    await waitForReadiness(url, measurements);
    const receipt = await request('/api/v1/parents/register', 202, {
      method: 'POST',
      headers: { ...headers, 'X-Education-Request': 'registration' },
      body: JSON.stringify({ email, password }),
    });
    if ((await receipt.json()).mail !== 'not-sent')
      throw new Error('Staging must use isolated mail');
    const login = await request('/api/v1/parents/login', 200, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });
    const setCookie = login.headers.get('set-cookie') ?? '';
    if (
      !/^__Host-education_session=/.test(setCookie) ||
      !['Secure', 'HttpOnly', 'SameSite=Lax', 'Path=/'].every((flag) => setCookie.includes(flag)) ||
      /;\s*Domain=/i.test(setCookie)
    )
      throw new Error('Unsafe session cookie');
    const cookie = setCookie.split(';')[0];
    const session = await request('/api/v1/session', 200, { headers: { Cookie: cookie } });
    const view = await session.json();
    if (view.email !== email || view.access !== 'verification-only')
      throw new Error('Session did not persist');
    await request('/api/v1/parents/logout', 204, {
      method: 'POST',
      headers: { ...headers, Cookie: cookie, 'X-CSRF-Token': view.csrfToken },
      body: '{}',
    });
    await request('/api/v1/session', 401, { headers: { Cookie: cookie } });
    return measurements;
  } finally {
    await cleanup(email);
  }
}
