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

| 范围     | 命令                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------- |
| 通用     | npm run format:check；npm run lint；npm run arch；npm run typecheck                             |
| 单元     | npm test                                                                                        |
| 构建     | npm run build；npm run build-storybook                                                          |
| 浏览器   | npm run test:e2e（先构建并安装匹配的 Chromium 和 WebKit）                                       |
| 数据库   | npm run db:migrate；npm run test:db（必须使用隔离的 DATABASE_URL 和另一个 DELETION_LEDGER_URL） |
| 重复代码 | npx --no-install jscpd .                                                                        |

完整常规检查 npm run check；数据库和浏览器检查单独执行，真实报告通过/失败/未运行。

## 重型检查

重型检查要占大量内存或用到 Docker，多个 issue 并行开发时同一时间只跑一个：npm run test:e2e、npm run test:visual、npm run test:accounts。

检查跑完，不管通过还是失败，它启动的进程和容器都要结束：

- test:visual 的容器和 test:accounts 的 Compose 项目由脚本自己清理。test:accounts 中途被打断时，用 docker compose ls 找到 education-accounts- 开头的项目，再对它执行 down -v。
- 自己手动启动的服务（例如按 playwright.config.ts 的端口和命令启动的 API），跑完全部关掉。
- 收尾后，docker ps 里看不到这些检查的容器。

检查要用 Docker 而它没在运行时，先用 docker desktop start 启动；连续跑几个 Docker 检查时只启动一次。最后一个跑完后，由这次启动它的一方用 docker desktop stop 退出；原本就开着的不动。

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
- Conventional Commits，每个提交只做一件事。采用 squash merge；生产显式手动发布。
- 所有改动走 PR；CI 与审查通过前不合并，中高风险由维护者确认。不能访问 GitHub API 时报告，不能声称 PR 或保护规则已创建。
- 未经用户批准，不配置账号级别权限、付费服务或自动合并。

## 文档

- docs/README.md：需求、架构与决策索引。
- REVIEW.md：审查标准；AGENTS.md：工具入口。
- README.md：实际运行命令与尚未开放的功能。
