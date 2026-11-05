import { spawn } from 'node:child_process';

export function command(program, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, {
      timeout: 180_000,
      ...options,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, output }));
    child.stdin.end(options.input);
  });
}

export async function compose(args, options = {}) {
  if (!/^education-accounts-[a-f0-9]+$/.test(process.env.COMPOSE_PROJECT_NAME ?? '')) {
    throw new Error('The isolated account-test project is required');
  }
  const env = { ...process.env };
  // Select the managed local daemon, preserving proxy defaults and registry credentials.
  for (const key of [
    'DOCKER_HOST',
    'DOCKER_CONTEXT',
    'DOCKER_TLS',
    'DOCKER_TLS_VERIFY',
    'DOCKER_CERT_PATH',
  ])
    delete env[key];
  const result = await command(
    'docker',
    [
      '--host=unix:///var/run/docker.sock',
      'compose',
      '-p',
      process.env.COMPOSE_PROJECT_NAME,
      '-f',
      'infra/compose.accounts.yml',
      ...args,
    ],
    { env, ...options },
  );
  if (result.code !== 0 && !options.allowFailure) {
    throw new Error(
      `Isolated Compose command failed: ${args.slice(0, 3).join(' ')}\n${result.output}`,
    );
  }
  return result;
}

export async function database(sql) {
  const result = await compose(
    [
      'exec',
      '-T',
      'db',
      'psql',
      '-XAt',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'education',
      '-d',
      'education_accounts_test',
    ],
    { input: sql },
  );
  return result.output.trim();
}
