import { execFileSync } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';

export function vercelApi(token, teamId) {
  return async (method, path, body) => {
    const response = await fetch(
      `https://api.vercel.com${path}?teamId=${encodeURIComponent(teamId)}`,
      {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    // Provider responses and request bodies can contain environment credentials.
    if (!response.ok) throw new Error(`Vercel ${method} failed (HTTP ${response.status})`);
    return response.status === 204 ? {} : response.json();
  };
}

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
    files.push({ file: name, data: (await readFile(name)).toString('base64'), encoding: 'base64' });
  }
  return files;
}
