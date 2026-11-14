#!/usr/bin/env node
// SessionStart 钩子：把这个克隆的 git hooks 指向仓库里的 .githooks 目录，让 .githooks/commit-msg 在每次提交时检查提交信息。
// core.hooksPath 存在每个克隆自己的 git 配置里，不随仓库走，所以新克隆、换一台机器或云端会话开始时都是没设的。
// Claude Code 在每次会话开始时运行本脚本：没设就设一次，之后不输出。克隆已经把 hooks 目录用于别的用途（例如 .husky）时不改，只报告。
// 它不会拦住会话：输出的内容交给 Claude 作为上下文，退出码始终是 0。
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const HOOKS_DIR = '.githooks';
const PUSH_CHECK = 'node .github/scripts/check-commit-message.mjs --range origin/<目标分支>..HEAD';
const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function git(...args) {
  try {
    return {
      ok: true,
      out: execFileSync('git', args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim(),
    };
  } catch (error) {
    return { ok: false, out: String(error.stderr || error.message).trim() };
  }
}

function main() {
  const root = git('rev-parse', '--show-toplevel');
  if (!root.ok || !existsSync(join(root.out, HOOKS_DIR, 'commit-msg'))) return;

  const configured = git('config', '--get', 'core.hooksPath');
  const current = configured.ok ? configured.out : '';
  if (current !== '' && resolve(root.out, current) === resolve(root.out, HOOKS_DIR)) return;

  if (current !== '') {
    console.log(
      `这个克隆的 core.hooksPath 是 "${current}"，所以 ${HOOKS_DIR}/commit-msg 在提交时不会检查提交信息。` +
        `每次提交后、推送前运行 ${PUSH_CHECK}，并告诉用户：用户可以把自己的 hooks 挪进 ${HOOKS_DIR}，再运行 git config core.hooksPath ${HOOKS_DIR}`,
    );
    return;
  }

  const set = git('config', 'core.hooksPath', HOOKS_DIR);
  console.log(
    set.ok
      ? `已为这个克隆把 core.hooksPath 设为 ${HOOKS_DIR}，${HOOKS_DIR}/commit-msg 会检查每条提交信息。`
      : `无法设置 core.hooksPath（${set.out}），提交时不会检查提交信息。每次提交后、推送前运行 ${PUSH_CHECK}，并请用户运行 git config core.hooksPath ${HOOKS_DIR}`,
  );
}

main();
