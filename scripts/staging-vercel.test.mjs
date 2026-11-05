import assert from 'node:assert/strict';
import { test } from 'node:test';
import { vercelApi } from './staging-vercel.mjs';

test('deployment errors cannot echo environment credential values into logs', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'private-credential-fixture' } }), {
      status: 400,
    });
  try {
    await assert.rejects(
      vercelApi('test-token', 'team_fixture')('POST', '/v13/deployments', {
        env: { DATABASE_URL: 'private-credential-fixture' },
      }),
      (error) => {
        assert.match(error.message, /HTTP 400/);
        assert.equal(error.message.includes('private-credential-fixture'), false);
        return true;
      },
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('public alias permission errors retain actionable provider details', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'Domain belongs to another project' } }), {
      status: 403,
    });
  try {
    await assert.rejects(
      vercelApi('test-token', 'team_fixture')('POST', '/v2/deployments/dpl_fixture/aliases', {
        alias: 'staging.example.test',
      }),
      /HTTP 403.*Domain belongs to another project/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
