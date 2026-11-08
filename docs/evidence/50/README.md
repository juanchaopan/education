# #50 脱敏运行指标与故障告警

状态：验收完成。请求日志、数据库失败归类和 AI 用量汇总已上线到 staging；本地停库演练和 GitHub 上的告警演练都通过，维护者收到了指派给自己的告警通知。做法见 [运行日志与告警](../../deployment/staging.md#运行日志与告警)。告警渠道由维护者选定：GitHub issue。

## 实现

PR #120 和 PR #122。

- 请求日志（`apps/api/src/shared/request-log.ts`）：每个请求随机生成请求 ID，写进响应头 `X-Request-Id`，请求结束时写一行 JSON，字段是 requestId、method、route（路由模式）、status、durationMs、outcome，以及需要时的 code 和 ai。outcome 分为 ok、client-error、rate-limited、maintenance、unavailable、database、server-error。每个请求只写这一行。
- 数据库失败的归类（`apps/api/src/shared/database-error.ts`）：PostgreSQL 返回的错误记它的 SQLSTATE，连接和证书失败记允许列表里的错误码，驱动和连接池的超时记 TIMEOUT；查询构造器包裹的错误按里面的原始错误归类。请求处理、就绪检查和连接池用同一个归类。就绪检查本身失败记为 database，数据库能回答但服务开关关闭或迁移未完成记为 maintenance。
- AI 请求（`apps/api/src/ai/routes/child-ai-request.ts`）：每个 AI 路由都经过这里，只记资源、结果、回退原因和来源（规则或 AI）。
- AI 用量（`apps/api/src/database/ai-usage-report.ts`）：每小时维护的最后一步汇总上一个整点小时的调用数、token 和计入预算的金额。结束的调用里至少三次、且至少一半没有可用回复（被拒绝、没有回复或超出范围），或本月有回复超出范围、付费 AI 已暂停时，打开 `staging 告警：ai-provider`；一小时里没有结束的调用、也没有暂停时不改变告警。
- 告警（`scripts/staging-alert.mjs`、`scripts/staging-alerts.mjs`、`.github/workflows/staging-alerts.yml`）：每小时两次探测就绪和发布版本号；staging 发布、备份、维护、恢复运行结束后，每个任务是一个告警来源，失败的任务打开它的告警，同一任务下一次成功时关闭，被跳过的任务不改变告警。每个来源一个带 `staging-alert` 标签的 issue，各自排队。新告警指派给 `STAGING_ALERT_ASSIGNEE`，没有设置时指派给仓库所有者。staging 未启用时写明没有告警渠道在工作。

日志不记录请求头、cookie、请求体、查询参数和异常消息。没有新的秘密、迁移或付费服务。

## 自动化测试

| 命令                                                      | 覆盖                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test -w @education/api`（`request-log.test.ts`）     | 每个请求一行，请求 ID 等于响应头且每次不同；记录路由模式而不是带令牌的 URL；带 PIN、KEY、密码的 PostgreSQL 错误只留 SQLSTATE；连接拒绝、连接超时和查询构造器包裹的连接中断记为 database，`EPIPE` 和普通的请求超时不算；限流、未配置和意外错误分开；开关关闭记为 maintenance，数据库连不上记为 database；AI 回退和 AI 回复只记结果、原因和来源 |
| 同上（每个用例）                                          | 日志全文里没有 PIN、注册 KEY、家长密码、会话令牌、孩子的文字、绘图、模型的回复和 `postgres://`                                                                                                                                                                                                                                                |
| `npm test -w @education/api`（`app.test.ts`）             | 就绪检查出错时只记允许的错误码或 UNKNOWN，不记连接串和密码                                                                                                                                                                                                                                                                                    |
| `npm test -w @education/api`（`ai-usage-report.test.ts`） | 没有调用、调用进行中、少数失败时不告警；至少三次且一半失败时告警供应商失败，整批被供应商拒绝也算；本月暂停时即使这一小时没有调用也告警                                                                                                                                                                                                        |
| `npm run test:db`（`ai-usage-report.integration.ts`）     | 按时间窗口和结算状态汇总调用数、token 和金额，不含窗口外的调用；本月有超出范围的回复时报告暂停，下个月不再暂停，没有调用的一小时不作判断                                                                                                                                                                                                      |
| `npm run test:staging`（`staging-alert.test.mjs`）        | 健康检查要求就绪和 40 位版本号，并为每个请求计时；数据库持续不可用、版本号缺失或无法连接都算异常；每个任务失败时打开、成功时关闭自己的告警，被跳过的任务不改变告警，运行没能启动时告警整个工作流；第一次失败开 issue，持续失败不再通知，恢复后评论并关闭；新告警带标签并指派给值班的人，没有人值班时不指派；读不到运行的任务时报出失败的请求  |

PR #120 和 PR #122 的 CI（含真实 PostgreSQL 的 `test:db`、浏览器测试、双实例账号测试和视觉回归）全部通过。

## 本地故障演练（2026-11-07）

在本机运行构建后的 API（`node apps/api/dist/index.js`），连本地 PostgreSQL 17 容器，依次请求就绪、题库、带 `?token=` 的验证接口和一次用 PIN 的孩子登录，然后停止数据库容器，再请求一遍，最后启动数据库。

| 步骤         | 结果                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 数据库正常   | `/health/ready` 200，`outcome: ok`；验证接口 400，`route` 是 `/api/v1/parents/verification`，没有令牌；孩子登录 401，`client-error` |
| 停止数据库   | 空闲连接断开，记一行 `Database connection unavailable`，`database: application`，`code: 57P01`                                      |
| 数据库停止后 | `/health/ready`、`/api/v1/problems`、孩子登录都返回 503，每个请求一行，`outcome: database`、`code: ECONNREFUSED`，带请求 ID         |
| 数据库恢复后 | `/health/ready` 回到 200                                                                                                            |

日志全文里没有令牌 `secret-token-123`、PIN `583920` 和连接串。停库期间家长和孩子页面拿到的都是 503：草稿保存失败时保留笔迹并显示未同步（`useLessonDraft.test.tsx`“keeps ink on failure, retries it…”），AI 请求失败时转为引导（`useTeachingFeedback.test.tsx`“turns server fallbacks and failures into guidance states…”），不显示虚假成功。

## GitHub 上的演练（2026-11-08 UTC）

### 第一次：PR #120 合并为 `21747d7` 后

| 步骤           | 结果                                                                                                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| staging 发布   | 合并后的发布成功，`/version.json` 为 `21747d7108213e92cfc09fe6a8d1032382c66c0b`，`/api/v1/problems` 的响应头带 `X-Request-Id`                                                                                           |
| 发布运行的告警 | 两次 staging 运行结束后，告警工作流读到 `staging/prepare`、`staging/deploy` 都成功，没有打开 issue                                                                                                                      |
| drill          | [42436984670](https://github.com/juanchaopan/education/actions/runs/42436984670) 在 02:05:09 打开 #121“staging 告警：health”，正文列出演练目标、就绪检查和版本文件都是 `fetch failed`，以及运行记录                     |
| 恢复           | 不带 drill 的 [42437023860](https://github.com/juanchaopan/education/actions/runs/42437023860) 探测通过（`/health/ready` 200，4239 ms，含 Neon 唤醒；`/version.json` 200，431 ms），02:05:45 在 #121 评论“已恢复”并关闭 |
| 通知           | 维护者没有收到。维护者没有 Watch 这个仓库，Actions 机器人新开的 issue 不会给维护者产生任何通知；PR #122 因此把新告警指派给值班的人                                                                                      |

### 第二次：PR #122 合并为 `67d42ee` 后

| 步骤  | 结果                                                                                                                                                                                                      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| drill | [42440590294](https://github.com/juanchaopan/education/actions/runs/42440590294) 在 02:56:22 打开 #123“staging 告警：health”，指派给仓库所有者                                                            |
| 通知  | GitHub 通知 API 里有 #123 的通知，原因是 `assign`。维护者收到了通知邮件，内容和 issue 正文一致；一开始在另一个邮箱里找，没看到，邮件发往 GitHub 通知设置里选的邮箱                                        |
| 恢复  | 不带 drill 的 [42441077421](https://github.com/juanchaopan/education/actions/runs/42441077421) 探测通过（`/health/ready` 200，3995 ms；`/version.json` 200，400 ms），03:03:39 在 #123 评论“已恢复”并关闭 |

## 还没有验证的

- 真实的发布、备份或维护失败触发的告警，只由脚本测试覆盖。
- 供应商故障告警：staging 没有 AI 密钥，账本里没有调用，只由测试覆盖。
- Vercel 运行日志的实际保留时长，以及从 Vercel 控制台按 requestId 查到日志行。
- 生产的监控和告警随 #52 接入。GitHub 定时任务可能推迟，探测不代表大陆设备的访问情况。
