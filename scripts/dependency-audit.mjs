// The scheduled dependency audit: reads the JSON of a full `npm audit`
// (development dependencies and every severity included) and keeps one open
// issue per advisory, labelled dependency-audit. A new advisory opens its
// issue, one still reported updates it, and one no longer reported is closed.
// Pull requests are blocked only by high or critical advisories in runtime
// dependencies (the security job of CI); the rest is handled here.
//   node scripts/dependency-audit.mjs <audit.json>
// It runs in GitHub Actions with the gh command line and the workflow token.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const label = 'dependency-audit';
const titlePrefix = '依赖漏洞：';

// The advisories in an audit report, each once, with where the vulnerable
// package is installed.
export function findings(report) {
  if (report.error)
    throw new Error(`npm audit failed: ${report.error.summary ?? report.error.code}`);
  const advisories = new Map();
  for (const vulnerability of Object.values(report.vulnerabilities ?? {}))
    for (const via of vulnerability.via)
      if (typeof via === 'object') {
        const id = via.url.split('/').at(-1);
        const { name, title, url, severity, range } = via;
        const finding = advisories.get(id) ?? { id, name, title, url, severity, range };
        finding.installed = [...new Set([...(finding.installed ?? []), ...vulnerability.nodes])];
        advisories.set(id, finding);
      }
  return [...advisories.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export const issueTitle = (finding) => `${titlePrefix}${finding.name} ${finding.id}`;

export function issueBody(finding, runUrl) {
  return [
    '每周的完整依赖扫描（`npm audit`，含开发依赖）报告了这条漏洞；下一次扫描不再报告时自动关闭。',
    '',
    `- 严重程度：${finding.severity}`,
    `- 漏洞：${finding.title}`,
    `- 受影响的版本：${finding.name} ${finding.range}`,
    `- 安装位置：${finding.installed.join('、')}`,
    `- 公告：${finding.url}`,
    '',
    `运行记录：${runUrl}`,
  ].join('\n');
}

// What to do with the open issues: open one for each new advisory, update
// those still reported, and close those no longer reported.
export function plan(open, current) {
  const byTitle = new Map(open.map((issue) => [issue.title, issue]));
  const reported = new Set(current.map(issueTitle));
  return {
    create: current.filter((finding) => !byTitle.has(issueTitle(finding))),
    update: current
      .filter((finding) => byTitle.has(issueTitle(finding)))
      .map((finding) => ({ number: byTitle.get(issueTitle(finding)).number, finding })),
    close: open.filter(
      (issue) => issue.title.startsWith(titlePrefix) && !reported.has(issue.title),
    ),
  };
}

function gh(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8' });
  if (result.status !== 0)
    throw new Error(`gh ${args.slice(0, 2).join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}

function sync(report, runUrl) {
  const list = ['issue', 'list', '--label', label, '--state', 'open', '--limit', '500'];
  const open = JSON.parse(gh([...list, '--json', 'number,title']));
  const { create, update, close } = plan(open, findings(report));
  if (create.length)
    gh([
      'label',
      'create',
      label,
      '--force',
      '--color',
      'd93f0b',
      '--description',
      '每周依赖扫描的发现',
    ]);
  for (const finding of create) {
    const body = issueBody(finding, runUrl);
    gh(['issue', 'create', '--title', issueTitle(finding), '--label', label, '--body', body]);
  }
  for (const { number, finding } of update)
    gh(['issue', 'edit', String(number), '--body', issueBody(finding, runUrl)]);
  for (const { number } of close) {
    const comment = `下一次扫描不再报告这条漏洞。运行记录：${runUrl}`;
    gh(['issue', 'close', String(number), '--comment', comment]);
  }
  console.log(`opened ${create.length}, updated ${update.length}, closed ${close.length}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
    sync(report, `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
