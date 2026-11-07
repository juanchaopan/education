import assert from 'node:assert/strict';
import { test } from 'node:test';
import { releaseStaging, validateRelease } from './staging-release.mjs';

const settings = {
  projectId: 'prj_fixture',
  teamId: 'team_fixture',
  origin: 'https://staging.example.test',
  revision: 'a'.repeat(40),
};

function fixture(failure) {
  const events = [];
  const api = async (method, path, body) => {
    events.push(`${method} ${path}`);
    if (path.startsWith('/v9/projects/')) return { name: 'education-staging', nodeVersion: '24.x' };
    if (path.startsWith('/v4/aliases/'))
      return { deploymentId: 'dpl_candidate', projectId: settings.projectId };
    if (method === 'POST' && path === '/v13/deployments') {
      assert.equal(body.target, 'staging');
      return { id: 'dpl_candidate' };
    }
    if (method === 'GET')
      return {
        id: 'dpl_candidate',
        projectId: settings.projectId,
        url: 'candidate.vercel.app',
        readyState: failure === 'build' ? 'ERROR' : 'READY',
      };
    return {};
  };
  const task = (name) => async () => {
    events.push(name);
    if (failure === name) throw new Error(name);
  };
  return {
    events,
    options: {
      ...settings,
      api,
      files: [],
      migrate: task('migrate'),
      smoke: task('smoke'),
      stillCurrent: task('current'),
      wait: async () => {},
    },
  };
}

test('only promotes a candidate after build, controlled migration, smoke and main revision checks', async () => {
  const { events, options } = fixture();
  const result = await releaseStaging(options);
  assert.equal(result.revision, settings.revision);
  assert.ok(events.indexOf('migrate') < events.indexOf('smoke'));
  assert.equal(events.at(-1), 'GET /v4/aliases/staging.example.test');
  assert.equal(events.filter((value) => value === 'current').length, 2);
});

for (const failure of ['build', 'migrate', 'smoke', 'current']) {
  test(`${failure} failure never changes the staging alias`, async () => {
    const { events, options } = fixture(failure);
    await assert.rejects(releaseStaging(options));
    assert.equal(
      events.some((value) => value.endsWith('/aliases')),
      false,
    );
    if (failure !== 'current') assert.ok(events.includes('DELETE /v13/deployments/dpl_candidate'));
  });
}

test('cannot target a production project or a non-HTTPS/non-exact origin', async () => {
  for (const origin of [
    'http://staging.example.test',
    'https://staging.example.test/path',
    'https://user:pass@staging.example.test',
  ]) {
    assert.throws(() => validateRelease({ ...settings, origin }));
  }
  const { options } = fixture();
  options.api = async () => ({ name: 'education-production', nodeVersion: '24.x' });
  await assert.rejects(releaseStaging(options), /dedicated staging/);
});

test('an ambiguous alias response never deletes the potentially live deployment', async () => {
  const { events, options } = fixture();
  const api = options.api;
  options.api = async (method, path, body) => {
    if (path.endsWith('/aliases')) throw new Error('network timeout after provider accepted alias');
    return api(method, path, body);
  };
  await assert.rejects(releaseStaging(options));
  assert.equal(
    events.some((value) => value.startsWith('DELETE')),
    false,
  );
});

test('cannot report success if the provider alias still points at another deployment', async () => {
  const { events, options } = fixture();
  const api = options.api;
  options.api = async (method, path, body) =>
    path.startsWith('/v4/aliases/')
      ? { deploymentId: 'dpl_old', projectId: settings.projectId }
      : api(method, path, body);
  await assert.rejects(releaseStaging(options), /could not be verified/);
  assert.equal(
    events.some((value) => value.startsWith('DELETE')),
    false,
  );
});
