# 小小探索家

@AGENTS.md

中文儿童交互式解题网站，当前仅空框架；需求和架构见 docs/README.md。

## 组件

| 组件                 | 目录     | 技术栈                                     | 职责                         |
| -------------------- | -------- | ------------------------------------------ | ---------------------------- |
| web                  | apps/web | React 19、Vite 8、TypeScript 7             | 儿童友好页面与家长空间       |
| api                  | apps/api | Fastify 5、TypeBox、Drizzle、PostgreSQL 17 | 空题库 API、配置与数据库基础 |
| contracts / problems | libs/    | TypeScript 7                               | 共享协议与空题目清单         |

## 自检命令

所有命令在仓库根目录运行，Node.js 24、npm 11。首次 npm ci 后先 npm run build:libs。

| 范围     | 命令                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通用     | npm run format:check；npm run lint；npm run arch；npm run typecheck                                                                                                       |
| 单元     | npm test                                                                                                                                                                  |
| 构建     | npm run build；npm run build-storybook                                                                                                                                    |
| 浏览器   | npm run test:e2e（先构建并安装匹配的 Chromium 和 WebKit）；本机用 npm run test:e2e:local，它带临时数据库，需要数据库的用例一个不跳过                                      |
| 数据库   | npm run db:migrate；npm run test:db（必须使用隔离的 DATABASE_URL 和另一个 DELETION_LEDGER_URL）；本机用 npm run test:db:local，它在临时容器里按 CI 的顺序建库、迁移、测试 |
| 重复代码 | npx --no-install jscpd .                                                                                                                                                  |

完整常规检查 npm run check；数据库和浏览器检查单独执行。每条命令的结果都要如实报告：通过、失败（给出失败的行和输出的最后几行）或未运行；长输出先过滤（`<命令> 2>&1 | tail -n 30`），不要整段打印。test:db:local 和 test:e2e:local 后面的参数原样交给测试命令（Vitest 或 Playwright），例如一个测试文件或 --repeat-each。

## 测试

种类按 scaffold skill 的 `shared/testing.md`：静态检查、单元、组件、集成、端到端、快照、交付和非功能。静态检查、单元和组件是轻的，由上面的自检命令运行：单元测试在 api、libs、web 的纯逻辑和 scripts 里，组件测试是 web 里用 jsdom 和 Testing Library 的 `*.test.tsx`。本项目用到的重型种类：

| 种类                                  | 命令                                                                                   | 环境和占用                                                                                                                                                                                                                                                        | 每次提交前                                               | 开 PR 前                                                                              | CI job                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 集成                                  | npm run test:db:local                                                                  | 临时 postgres:17-alpine 容器 education-db-\*（和 CI 同一镜像、用户和库名，随机密码），在 127.0.0.1 上脚本自己挑的空闲端口；没有输出目录；Docker 虚拟机（这台机器上 3–6 GB）加 Vitest 约 1 GB                                                                      | 相关的：`npm run test:db:local -- --changed origin/main` | `related`：同左，对整个分支的改动                                                     | database                                               |
| 端到端                                | npm run test:e2e:local                                                                 | 6 个 API 服务占 `E2E_PORT` 起连续 6 个端口（默认 4173–4178），加一个同上的临时数据库容器；test-results/（开始时整个清空）；5–6 GB（实测，默认 worker 数下 6 个 API 服务加浏览器）加 Docker 虚拟机                                                                 | 受影响的流程，见下面的对应表                             | `related`：按对应表选整个分支改动覆盖的流程，在 Chromium 桌面、iPhone 13、WebKit 里跑 | app                                                    |
| 端到端（打包镜像、双实例）和交付      | npm run test:accounts                                                                  | Compose 项目 education-accounts-\*：构建应用镜像，跑 PostgreSQL、失败和受控的迁移、两个应用实例和 HTTPS 入口；`ACCOUNTS_PORT_A` / `ACCOUNTS_PORT_B`（默认 8443/8444）；test-results/accounts/、infra/.env.accounts-\*；最重，Docker 虚拟机 6 GB 以上另加 Chromium | 改了身份、会话、迁移、镜像或部署配置时                   | `related`：整个分支改了身份、会话、迁移、镜像或部署配置时                             | accounts；合并后 staging.yml 发布到 staging 并跑 smoke |
| 快照                                  | npm run test:visual                                                                    | 固定版本的 Playwright 镜像容器 education-visual-\*，依赖装在缓存卷 education-visual-deps-\*；不占主机端口（4190/6190 只在容器里）；test-results/visual/，加 --update 时还有 visual/\*-snapshots/；Docker 虚拟机                                                   | 受影响的截图：`--grep <名字>` 或测试文件                 | `related`：按对应表选整个分支改动覆盖的截图                                           | visual                                                 |
| 非功能（WCAG 2.2 AA、触摸目标、缩放） | npm run test:visual（accessibility.spec.ts 和每张截图后的 axe）                        | 同快照                                                                                                                                                                                                                                                            | 同快照                                                   | `related`：同快照                                                                     | visual                                                 |
| 非功能（依赖漏洞）                    | npm audit --omit=dev --audit-level=high；完整的 npm audit 由每周的 dependency-audit 跑 | 不用环境，只读 package-lock.json；联网查公告；不占端口和目录                                                                                                                                                                                                      | 改了依赖时                                               | `related`：整个分支改了依赖时                                                         | security；每周 dependency-audit                        |

审查录屏 npm run lesson:review 不是测试，产出给人看的证据；它占 `REVIEW_PORT`（默认 4195）和 review-recordings/，1 GB 左右。

- 开 PR 前的重型检查取 `related`：本机只跑覆盖整个分支改动的部分，CI 跑全部；这台机器内存不大，Docker 又占着一块，整套重型检查在本机跑得比 CI 还慢。PR 的 Testing 里写明哪些在本机跑了、哪些留给 CI。叠着做的多个 PR，这一步只在最上面的分支做一次。
- 不用的种类：性能（普通操作 2 秒、AI 5 秒开始响应）不测：没有目标网络的设备，上线后观察。负载（三个孩子同时学习）不建：目标还没定。从上一个发布升级的交付测试这次不做：还没有正式发布，放在发布前。
- 发布前另做：真机 iPad 和 iPhone 的 Safari，从上一个发布升级。
- 一个改动对应的测试：单元、组件和集成用 Vitest 按模块依赖图选，`npm run test --workspaces --if-present -- --changed origin/main` 和 `npm run test:db:local -- --changed origin/main`；改了 package.json 或测试配置时 Vitest 会跑全部。端到端和快照按下表的目录选；Playwright 的 `--only-changed` 只看测试文件自己的 import，不看应用代码，只作补充。拿不准就多跑。

  | 改动的目录                                                                                  | 端到端（e2e/）                                                                                                                                  | 快照（visual/）                          |
  | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
  | apps/web/src/features/family、apps/api/src/identity，api 里家庭、授权、学习摘要和时长的文件 | registration、session、recovery、verification、registration-key、child-\*、family-\*、ai-consent、learning-summary、study-time、empty-framework | pages.spec.ts 的家长空间、孩子登录和注册 |
  | apps/web/src/features/learning、apps/api/src/learning、libs/problems，草稿和作答的文件      | garden-\*、lesson-\*、hold-to-talk、conclusion-board                                                                                            | pages.spec.ts 的题目页，stories.spec.ts  |
  | apps/web/src/features/library、apps/api/src/catalog，书架的文件                             | bookshelf、catalog                                                                                                                              | pages.spec.ts 的题库和练习安排           |
  | apps/web/src/shared、apps/web/src/app、libs/contracts，api 的 app.ts 和 application.ts      | 全部                                                                                                                                            | 全部                                     |

- 时间目标：每次提交前 10 分钟，开 PR 前 60 分钟。超出时按改动选、分片、缓存，或把检查挪到后面的阶段；不能删掉。
- 结果随外部变化的检查（依赖漏洞扫描这类，新公告发布后不改代码结果也会变），PR 上只拦改动能负责的：相对基线新出现的，或线上依赖里的 high/critical；其余交给定时运行，由它开或更新 issue。PR 因为不是本次改动造成的问题失败时，报告里写明，另开 PR 或记 issue，不混进本次改动。
- CI 失败时先在本机用同一命令复现，再推修复；不稳定的测试开 issue 修，不靠反复重跑；基准截图只为有意的外观改动更新。
- 互相不占用同一样东西的检查，机器扛得住时可以同时跑。能配置的端口每次换一个空闲的，就不算共用；test:e2e 开始时清空整个 test-results/，所以同一个工作区里它和 test:visual、test:accounts 共用输出目录，不同工作区各有自己的 test-results/。用 Docker 的检查共用一个 Docker 虚拟机，内存要按它算。
- 多个 issue 并行开发时，重型检查一个一个启动：先拿 `.git/dev-workflow-locks/launch.lock`，持锁的才看空闲内存、启动检查，等它占上内存再放锁，下一个看到的才是真实剩余；这台机器同一时间只扛得住一个 test:e2e、test:visual 或 test:accounts。
- 重型检查跑完，不管通过还是失败，它启动的东西都不再运行：test:visual 的容器、test:db:local 和 test:e2e:local 的数据库容器、test:accounts 的 Compose 项目由脚本自己清理，按 Ctrl+C 打断时也一样；test:visual 的依赖缓存卷留着给下次用，package-lock.json 变了以后旧卷由下一次运行删掉。脚本被强行结束、来不及清理时，用 docker ps -a --filter name=education-db- 和 --filter name=education-visual- 找到留下的容器执行 docker rm -f，test:accounts 用 docker compose ls 找到 education-accounts- 开头的项目执行 down -v；自己手动启动的服务（例如按 playwright.config.ts 的端口和命令启动的 API）跑完全部关掉。收尾后 docker ps 里看不到这些检查的容器。Docker Desktop：检查要用而它没在运行时用 docker desktop start 启动，连续跑几个 Docker 检查时只启动一次；最后一个跑完后，由这次启动它的一方用 docker desktop stop 退出，原本就开着的不动。
- 这台机器跑不了的检查交给 CI，PR 里写明"本机未运行"和原因：在 Windows 上，test:toolchain 里调用 oxlint 的用例找不到 node_modules/.bin/oxlint；test:accounts 的脚本经 unix:///var/run/docker.sock 连 Docker、从 /etc/ssl/certs 读 CA，只能在 Linux 上跑。

## 环境

- staging：https://education-access-spike.hyp.app ，正在运行的提交看 /version.json 的 revision；发布流程见 docs/deployment/staging.md。
- 一个改动完成须同时满足：PR 已合并；main 上合并提交的 CI 已通过；staging 运行的是这个提交，或者包含它的更新提交。

## 代码规范

- 遵守 .claude/rules/ 与 docs/adr/；域模型不依赖框架或数据库，展示组件不取数据。
- 不添加儿童可见的演示题；测试夹具不进入题目清单。
- 不提交密钥、个人输入或真实账号。付费 AI 开关默认开启，文字网关只供隔离验证，正式儿童入口须通过资格、授权与用量控制。
- 不把本地构建或服务器出站访问当作大陆访问/供应商资格证明。

## 写代码的方式

- 改完的代码要读起来像一次写成的。注释只说明现在的代码做什么、为什么这样设计；不写"改为…""新增…""修复…""原来是…"这类修改记录，修改历史留给提交信息。
- 不留死代码、注释掉的代码、不再使用的参数和分支，也不为兼容旧写法保留代码，除非有调用方确实还在用。
- 新需求放不进现有结构时，先调整结构，再加新功能：先做一个不改变行为的重构提交（测试保持通过），再做功能提交。不要往旧函数里不断追加 if 和参数。
- 同样的逻辑出现第二次时考虑提取，第三次时必须提取。
- 函数和文件变长、变复杂时拆开。复杂度和长度的上限由 lint 检查，重复代码由 jscpd 检查。
- 改动会大面积影响现有的类、接口或模块划分时，先停下来，用 /change 评估设计影响，不要边写边改。

## 目标与非目标

- 目标：可运行、可验证、可移植的空框架，后续按 roadmap 实现账号、教学与进度。
- 非目标：在用户提供题目前编造题库，或声称未实现功能已可用。

## 分支与提交

- GitHub Flow：main 为集成分支；feature/、feat/、fix/、docs/ 等分支通过 PR 合并。
- Conventional Commits：`<type>(<scope>): <description> (#<issue>)`，第一行不超过 100 个字符，例如 `feat(auth): 支持邮箱登录 (#12)`。
- 每次提交后、推送前运行 `node .github/scripts/check-commit-message.mjs --range origin/main..HEAD`，提交还在本地时就改好它报告的问题；CI 的 `commit-lint` 用同一套规则检查 PR 的每个提交，已经推送的提交没法靠追加提交来补救。
- `.githooks/commit-msg` 在克隆的 `core.hooksPath` 是 `.githooks` 时，也会在每次提交时检查提交信息。Claude Code 在会话开始时设置它（`.claude/settings.json`）；其他克隆克隆后运行一次 `git config core.hooksPath .githooks`。
- 每个提交只做一件事，提交时通过自检命令。变基之后自检只在分支的头上跑一次；采用 squash merge，只有最终的树进入 main，所以中间的提交不逐个检查。
- 合并方式：squash merge，一个 PR 一个提交；生产显式手动发布。
- 一个 issue 一个 PR；只有审查的人一次读不完 diff 时才拆，拆之前先告诉用户代价：每多一个 PR 就多一轮完整的 CI、审查和变基。
- 所有改动走 PR；CI 与审查通过前不合并，中高风险由维护者确认。不能访问 GitHub API 时报告，不能声称 PR 或保护规则已创建。
- 未经用户批准，不配置账号级别权限、付费服务或自动合并。

## 文档

- docs/README.md：需求、架构与决策索引。
- REVIEW.md：审查标准；AGENTS.md：工具入口。
- README.md：实际运行命令与尚未开放的功能。
