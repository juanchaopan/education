import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const image = process.env.PROBE_PG_IMAGE ?? 'postgres:17';
const container = 'education-spike-29-' + randomUUID();

function docker(args, input) {
  const child = spawn('docker', args, { timeout: 30_000 });
  const result = { stdout: '', stderr: '' };
  child.stdout.setEncoding('utf8').on('data', (data) => (result.stdout += data));
  child.stderr.setEncoding('utf8').on('data', (data) => (result.stderr += data));
  child.stdin.on('error', () => {}); // A failed psql may close stdin before consuming the script.
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve({ ...result, code }));
  });
  if (input !== undefined) child.stdin.end(input);
  return { result, done, stdin: child.stdin };
}

function output(result) {
  assert.equal(result.code, 0, result.stderr);
  return result.stdout.trim();
}

function exec(...args) {
  return docker(['exec', container, ...args], '').done.then(output);
}

function psql(db, script, { user = 'postgres', app = 'probe' } = {}) {
  return docker(
    ['exec', '-i', '-e', 'PGAPPNAME=' + app, container, 'psql',
      '-XqAt', '-v', 'ON_ERROR_STOP=1', '-U', user, '-d', db],
    script,
  );
}

function query(db, script, options) {
  return psql(db, script, options).done.then(output);
}

async function until(check, description, timeout = 12_000) {
  const deadline = Date.now() + timeout;
  do {
    if (await check()) return;
    await sleep(100);
  } while (Date.now() < deadline);
  throw new Error('Timed out waiting for ' + description);
}

async function race(label, sql, followers, duplicateSql = sql) {
  const holder = psql('live', undefined, { app: label + '-holder' });
  try {
    holder.stdin.write('BEGIN ISOLATION LEVEL READ COMMITTED;\n' + sql + '\n\\echo locked\n');
    await until(() => holder.result.stdout.includes('locked'), label + ' holder');

    const waiting = Array.from({ length: followers }, () =>
      psql('live', duplicateSql, { app: label + '-follower' }).done);
    await until(async () => {
      const blocked = await query('live',
        "SELECT count(*) FROM pg_stat_activity WHERE application_name = '" +
        label + "-follower' AND wait_event_type = 'Lock';");
      return Number(blocked) === followers;
    }, label + ' follower locks');

    holder.stdin.end('COMMIT;\n');
    const [winner, ...responses] = (await Promise.all([holder.done, ...waiting])).map(output);
    return [winner.split('\n')[0].trim(), ...responses];
  } finally {
    if (!holder.stdin.destroyed && !holder.stdin.writableEnded) holder.stdin.end('ROLLBACK;\n');
  }
}

async function testWrites() {
  for (const round of [1, 2, 3]) {
    const submission = "SELECT submit('keeper','q" + round + "','same-key','payload');";
    const [receipt, ...duplicates] = await race('attempt-' + round, submission, 2);
    assert.match(receipt, /^receipt:\d+$/);
    // The first caller discards its committed reply, then retries with the original key.
    duplicates.push(await query('live', submission));
    assert.deepEqual(duplicates, Array(3).fill(receipt));
    assert.equal(await query('live', submission.replace("'payload'", "'different'")), 'conflict');
    const stats = await query('live',
      "SELECT (SELECT count(*) FROM attempt WHERE child_id = 'keeper' AND question_version = 'q" +
      round + "'), total FROM progress WHERE child_id = 'keeper' AND question_version = 'q" + round + "';");
    assert.equal(stats, '1|1');
    console.log('attempt round=%d blocked=2 equal_retries=3 mismatched_payload=conflict attempts=1 progress=1', round);
  }

  const failed = "SELECT submit('keeper','rollback','request','payload');";
  assert.match((await psql('live', 'BEGIN; ' + failed + ' SELECT 1/0; COMMIT;').done).stderr, /division by zero/);
  assert.equal(await query('live', "SELECT count(*) FROM attempt WHERE question_version='rollback';" +
    "SELECT count(*) FROM progress WHERE question_version='rollback';"), '0\n0');
  assert.match(await query('live', failed), /^receipt:\d+$/);
  assert.equal(await query('live', "SELECT total FROM progress WHERE question_version='rollback';"), '1');
  console.log('failed_transaction attempts=0 progress=0 retry_progress=1');

  const initial = await query('live', "SELECT version FROM draft WHERE question_version='draft-race';");
  const update = "SELECT save_draft('keeper','draft-race'," + initial + ",'winner');";
  const [saved, stale] = await race('draft', update, 1, update.replace("'winner'", "'other-device'"));
  const version = saved.match(/^saved:(\d+)$/)?.[1];
  assert.ok(version);
  assert.equal(stale, 'conflict:' + version);
  const readDraft = "SELECT content FROM draft WHERE question_version='draft-race';";
  assert.equal(await query('live', readDraft), 'winner');
  const submit = "SELECT submit('keeper','draft-race','complete','payload'," + version + ");";
  const receipt = await query('live', submit);
  assert.equal(await query('live', readDraft), '');
  await query('live', "INSERT INTO draft (child_id, question_version, content, expires_at)" +
    " VALUES ('keeper','draft-race','new-draft',now()+interval '7 days');");
  assert.equal(await query('live', submit), receipt);
  assert.equal(await query('live', readDraft), 'new-draft');
  assert.equal(await query('live', "SELECT save_draft('keeper','draft-race'," + version + ",'stale-device');")
    .then((reply) => reply.startsWith('conflict:')), true);
  console.log('draft blocked=1 saved=1 conflict=1 submit_cleared=true retry_preserved_new_draft=true');
}

const readAccess = "SELECT token FROM session_token ORDER BY token;";

async function expectClosed(stage) {
  const result = await psql('restored', readAccess, { user: 'app_reader' }).done;
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /permission denied for database "restored"/);
  console.log('restore stage=%s app_connect=denied', stage);
}

async function replay(ledgerDb, { missingEntry = false, fail = false } = {}) {
  const filter = missingEntry ? 'WHERE seq <> 2' : '';
  const snapshot = await query(ledgerDb,
    "SELECT json_build_object('cutoff', cutoff, 'rows'," +
    ' (SELECT json_agg(t ORDER BY seq) FROM tombstone t ' + filter + ')) FROM sealed_cutoff;');
  const { cutoff, rows } = JSON.parse(snapshot);
  assert.equal(rows.length, cutoff, 'Incomplete deletion ledger');
  const ids = rows.map(({ seq, family_id }, index) => {
    assert.equal(seq, index + 1, 'Gap in deletion ledger');
    assert.match(family_id, /^[a-z-]+$/); // Fixture identifiers only.
    return "'" + family_id + "'";
  }).join(',');
  await query('restored', 'BEGIN; DELETE FROM family WHERE id IN (' + ids + ');' +
    'DELETE FROM draft WHERE expires_at <= now(); ' + (fail ? 'SELECT 1/0; ' : '') + 'COMMIT;');
}

async function testRecovery() {
  await exec('pg_dump', '-U', 'postgres', '-Fc', '-f', '/tmp/before-delete.dump', 'live');
  await query('ledger', 'BEGIN; CREATE TABLE tombstone (seq int PRIMARY KEY, family_id text NOT NULL UNIQUE);' +
    'CREATE TABLE sealed_cutoff (cutoff int NOT NULL);' +
    "INSERT INTO tombstone VALUES (1,'already-absent'),(2,'erase'); INSERT INTO sealed_cutoff VALUES (2); COMMIT;");
  await query('live', "DELETE FROM family WHERE id='erase';");
  assert.equal(await query('live', readAccess), 'keep-session');
  await query('postgres', 'REVOKE CONNECT ON DATABASE restored FROM PUBLIC; CREATE ROLE app_reader LOGIN;');
  await exec('pg_restore', '-U', 'postgres', '--exit-on-error', '--single-transaction',
    '--no-owner', '--no-acl', '-d', 'restored', '/tmp/before-delete.dump');
  const fixtureCounts = "SELECT (SELECT count(*) FROM family WHERE id='erase')," +
    " (SELECT count(*) FROM child WHERE id='erased'), (SELECT count(*) FROM attempt WHERE child_id='erased')," +
    " (SELECT count(*) FROM progress WHERE child_id='erased'), (SELECT count(*) FROM draft WHERE child_id='erased')," +
    " (SELECT count(*) FROM session_token WHERE token='old-session')," +
    " (SELECT count(*) FROM draft WHERE question_version='expired');";
  assert.equal(await query('restored', fixtureCounts), '1|1|1|1|1|1|1');
  console.log('restore old_backup deleted_family=1 child=1 attempt=1 progress=1 private_draft=1 old_session=1 expired_draft=1');
  await expectClosed('before-replay');
  await assert.rejects(replay('missing_ledger'), /database "missing_ledger" does not exist/);
  await expectClosed('ledger-unavailable');
  await assert.rejects(replay('ledger', { missingEntry: true }), /Incomplete deletion ledger/);
  await expectClosed('ledger-incomplete');
  await assert.rejects(replay('ledger', { fail: true }), /division by zero/);
  assert.equal(await query('restored', fixtureCounts), '1|1|1|1|1|1|1');
  await expectClosed('replay-rolled-back');

  for (let pass = 1; pass <= 2; pass += 1) {
    await replay('ledger');
    assert.equal(await query('restored', fixtureCounts), '0|0|0|0|0|0|0');
    console.log('restore replay=%d ledger_entries=2 deleted_fixture_rows=0 expired_draft=0', pass);
  }
  await expectClosed('verified-before-promotion');
  await query('restored', 'GRANT SELECT ON session_token, draft, attempt TO app_reader;');
  await query('postgres', 'GRANT CONNECT ON DATABASE restored TO app_reader;');
  const healthy = await query('restored', readAccess +
    " SELECT count(*) FROM attempt WHERE child_id='keeper'; SELECT content FROM draft;", { user: 'app_reader' });
  assert.equal(healthy, 'keep-session\n5\nnew-draft');
  console.log('restore promoted healthy_session=1 healthy_attempts=5 healthy_draft=1 old_session=0');
}

const started = performance.now();
try {
  output(await docker([
    'run', '--rm', '--pull=never', '-d', '--name', container, '--network', 'none',
    '--tmpfs', '/var/lib/postgresql/data:rw', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', image,
  ], '').done);
  await until(async () => (await docker(['exec', container, 'pg_isready',
    '-h', '127.0.0.1', '-U', 'postgres'], '').done).code === 0, 'PostgreSQL TCP readiness', 30_000);
  console.log('environment node=%s image=%s postgres=%s isolation=%s', process.version, image,
    await query('postgres', 'SHOW server_version;'), await query('postgres', 'SHOW transaction_isolation;'));
  for (const db of ['live', 'ledger', 'restored']) await exec('createdb', '-U', 'postgres', db);
  await query('live', await readFile(new URL('./fixture.sql', import.meta.url), 'utf8'));
  await testWrites();
  await testRecovery();
  console.log('PASS elapsed_seconds=%s', ((performance.now() - started) / 1000).toFixed(2));
} catch (error) {
  const logs = await docker(['logs', '--tail', '20', container], '').done;
  console.error(logs.stdout + logs.stderr);
  throw error;
} finally {
  const cleanup = await docker(['rm', '-fv', container], '').done;
  if (cleanup.code !== 0 && !cleanup.stderr.includes('No such container')) {
    throw new Error(cleanup.stderr);
  }
}
