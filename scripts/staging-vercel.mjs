import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';

const endpoint = (path, teamId) =>
  `https://api.vercel.com${path}?teamId=${encodeURIComponent(teamId)}`;

export function vercelApi(token, teamId) {
  return async (method, path, body) => {
    const response = await fetch(endpoint(path, teamId), {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    // Provider responses and request bodies can contain environment credentials.
    if (!response.ok) throw await vercelFailure(response, method, path);
    return response.status === 204 ? {} : response.json();
  };
}

// Uploads one release file's bytes, which Vercel keeps under their SHA-1.
export function vercelUpload(token, teamId) {
  return async (data) => {
    const sha = createHash('sha1').update(data).digest('hex');
    const response = await fetch(endpoint('/v2/files', teamId), {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'x-vercel-digest': sha,
      },
      body: data,
    });
    if (!response.ok) throw await vercelFailure(response, 'POST', '/v2/files');
    return sha;
  };
}

async function vercelFailure(response, method, path) {
  const summary = `Vercel ${method} failed (HTTP ${response.status})`;
  const data = await response.json().catch(() => ({}));
  // A provider error code is a fixed identifier and cannot carry a credential.
  const code = data.error?.code;
  const named =
    typeof code === 'string' && /^[a-z0-9_]{1,64}$/.test(code) ? `${summary} ${code}` : summary;
  // Alias requests contain only a public hostname; deployment errors may echo environment values.
  if (!path.endsWith('/aliases')) return new Error(named);
  const detail = data.error?.message;
  return new Error(typeof detail === 'string' ? `${named}: ${detail.slice(0, 400)}` : named);
}

// The tracked files a staging build needs, read from the checkout.
export async function releaseFiles() {
  const names = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  const allowed =
    /^(api\/|apps\/(api|web)\/|libs\/|package(?:-lock)?\.json$|tsconfig\.base\.json$|vercel\.json$|scripts\/build-staging\.mjs$)/;
  const files = [];
  for (const name of names.filter((name) => allowed.test(name))) {
    if (/(^|\/)\.env|\.(test|integration)\.|\/tests\//.test(name)) continue;
    if (!(await lstat(name)).isFile())
      throw new Error('Release inputs must be regular tracked files');
    files.push({ file: name, data: await readFile(name) });
  }
  return files;
}

// Uploads every file a few at a time and names each by path, SHA-1 and size,
// so the deployment request stays small however large the release is.
export async function uploadFiles(upload, files, concurrency = 8) {
  const named = new Array(files.length);
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const place = next++;
      const { file, data } = files[place];
      named[place] = { file, sha: await upload(data), size: data.length };
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));
  return named;
}
