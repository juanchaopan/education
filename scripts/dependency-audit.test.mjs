import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findings, issueBody, issueTitle, plan } from './dependency-audit.mjs';

const advisory = (id, name, severity = 'moderate') => ({
  source: 1,
  name,
  title: `${name} is unsafe`,
  url: `https://github.com/advisories/${id}`,
  severity,
  range: '<1.0.0',
});

const report = {
  auditReportVersion: 2,
  vulnerabilities: {
    esbuild: {
      name: 'esbuild',
      via: [advisory('GHSA-aaaa', 'esbuild')],
      nodes: ['node_modules/drizzle-kit/node_modules/esbuild'],
    },
    'drizzle-kit': { name: 'drizzle-kit', via: ['esbuild'], nodes: ['node_modules/drizzle-kit'] },
    glob: {
      name: 'glob',
      via: [advisory('GHSA-bbbb', 'glob'), advisory('GHSA-aaaa', 'esbuild')],
      nodes: ['node_modules/glob'],
    },
  },
};

test('each advisory is one finding, with where the vulnerable package is installed', () => {
  const found = findings(report);
  assert.deepEqual(
    found.map(({ id, name }) => [id, name]),
    [
      ['GHSA-aaaa', 'esbuild'],
      ['GHSA-bbbb', 'glob'],
    ],
  );
  assert.deepEqual(found[0].installed, [
    'node_modules/drizzle-kit/node_modules/esbuild',
    'node_modules/glob',
  ]);
});

test('a report without vulnerabilities has no findings', () => {
  assert.deepEqual(findings({ auditReportVersion: 2, vulnerabilities: {} }), []);
});

test('an audit that could not run fails instead of closing every issue', () => {
  assert.throws(
    () => findings({ error: { code: 'ENOTFOUND', summary: 'network down' } }),
    /network down/,
  );
});

test('a new advisory opens an issue, a reported one updates it, a gone one closes it', () => {
  const [esbuild, glob] = findings(report);
  const open = [
    { number: 7, title: issueTitle(esbuild) },
    { number: 9, title: '依赖漏洞：minimatch GHSA-cccc' },
    { number: 11, title: 'something else with the label' },
  ];
  const { create, update, close } = plan(open, [esbuild, glob]);
  assert.deepEqual(
    create.map(({ id }) => id),
    ['GHSA-bbbb'],
  );
  assert.deepEqual(
    update.map(({ number }) => number),
    [7],
  );
  assert.deepEqual(
    close.map(({ number }) => number),
    [9],
  );
});

test('the issue names the package and advisory and links the run', () => {
  const [esbuild] = findings(report);
  assert.equal(issueTitle(esbuild), '依赖漏洞：esbuild GHSA-aaaa');
  const body = issueBody(esbuild, 'https://github.com/o/r/actions/runs/1');
  assert.match(body, /严重程度：moderate/);
  assert.match(body, /https:\/\/github.com\/advisories\/GHSA-aaaa/);
  assert.match(body, /actions\/runs\/1/);
});
