import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

// How pg_dump and pg_restore reach a database: the address without its
// password, which goes in PGPASSWORD instead of the process arguments, and with
// verify-full TLS anchored on the provider's CA when one is set, otherwise on
// the system roots.
export async function libpqConnection(env, source, folder) {
  const url = new URL(env[source.url]);
  const password = decodeURIComponent(url.password);
  url.password = '';
  if (url.searchParams.get('sslmode') === 'verify-full') {
    const ca = env[source.ca];
    if (ca) {
      const path = join(folder, 'database-ca.pem');
      await writeFile(path, ca, { mode: 0o600 });
      url.searchParams.set('sslrootcert', path);
    } else url.searchParams.set('sslrootcert', 'system');
  }
  return { dbname: url.toString(), env: { ...process.env, PGPASSWORD: password } };
}

// Runs a PostgreSQL client tool for up to ten minutes. Its message carries only
// the first line of the tool's error, which names the failure without the
// connection details.
export async function postgresTool(tool, connection, args) {
  try {
    await run(tool, [...args, '--dbname', connection.dbname], {
      env: connection.env,
      timeout: 600000,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    const detail = `${error.stderr ?? ''}`.trim().split('\n')[0] || error.code || 'failed';
    throw new Error(`${tool} failed: ${detail}`, { cause: error });
  }
}
