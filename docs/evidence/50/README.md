# #50 脱敏运行指标与故障告警

状态：实现和本地故障演练完成；GitHub 上的告警演练要等 `staging-alerts` 工作流进入 main 后才能运行。做法见 [运行日志与告警](../../deployment/staging.md#运行日志与告警)。告警渠道由维护者选定：GitHub issue。

## 实现

- 请求日志（`apps/api/src/shared/request-log.ts`）：每个请求随机生成请求 ID，写进响应头 `X-Request-Id`，请求结束时写一行 JSON，字段是 requestId、method、route（路由模式）、status、durationMs、outcome，以及需要时的 code 和 ai。outcome 分为 ok、client-error、rate-limited、maintenance、unavailable、database、server-error。每个请求只写这一行。
- 数据库失败的归类（`apps/api/src/shared/database-error.ts`）：PostgreSQL 返回的错误记它的 SQLSTATE，连接和证书失败记允许列表里的错误码，超时记 TIMEOUT。请求处理、就绪检查和连接池用同一个归类。就绪检查本身失败记为 database，数据库能回答但服务开关关闭或迁移未完成记为 maintenance。
- AI 请求（`apps/api/src/ai/routes/child-ai-request.ts`）：每个 AI 路由都经过这里，只记资源、结果、回退原因和来源（规则或 AI）。
- AI 用量（`apps/api/src/database/ai-usage-report.ts`）：每小时维护的最后一步按结算状态汇总过去一小时的调用数、token 和计入预算的金额。供应商失败（发出的调用里至少三次、且至少一半没有可用回复）或有回复超出范围时，打开 `staging 告警：ai-provider`。
- 告警（`scripts/staging-alert.mjs`、`scripts/staging-alerts.mjs`、`.github/workflows/staging-alerts.yml`）：每小时两次探测就绪和发布版本号；staging 发布、备份、维护、恢复运行结束后读取任务结果。每个来源一个带 `staging-alert` 标签的 issue，失败时打开，成功时评论并关闭。监听的工作流没有登记决定性任务时，告警运行失败。staging 未启用时写明没有告警渠道在工作。

日志不记录请求头、cookie、请求体、查询参数和异常消息。没有新的秘密、迁移或付费服务。

## 自动化测试

| 命令                                                      | 覆盖                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test -w @education/api`（`request-log.test.ts`）     | 每个请求一行，请求 ID 等于响应头且每次不同；记录路由模式而不是带令牌的 URL；带 PIN、KEY、密码的 PostgreSQL 错误只留 SQLSTATE；连接拒绝和连接超时记为 database，`EPIPE` 这样的五字母代码不算；限流、未配置和意外错误分开；开关关闭记为 maintenance，数据库连不上记为 database；AI 回退和 AI 回复只记结果和原因 |
| 同上（每个用例）                                          | 日志全文里没有 PIN、注册 KEY、家长密码、会话令牌、孩子的文字、绘图、模型的回复和 `postgres://`                                                                                                                                                                                                                |
| `npm test -w @education/api`（`app.test.ts`）             | 就绪检查出错时只记允许的错误码或 UNKNOWN，不记连接串和密码                                                                                                                                                                                                                                                    |
| `npm test -w @education/api`（`ai-usage-report.test.ts`） | 没有调用、未发送、少数失败时不告警；至少三次且一半失败时告警供应商失败；任何超出范围的回复都告警                                                                                                                                                                                                              |
| `npm run test:db`（`ai-usage-report.integration.ts`）     | 按时间窗口和结算状态汇总调用数、token 和金额，不含窗口外的调用                                                                                                                                                                                                                                                |
| `npm run test:staging`（`staging-alert.test.mjs`）        | 健康检查要求就绪和 40 位版本号，并为每个请求计时；数据库持续不可用、版本号缺失或无法连接都算异常；任务失败才告警，决定性任务被跳过不改变告警，没有登记的工作流被拒绝；第一次失败开 issue，持续失败不再通知，恢复后评论并关闭；GitHub 客户端缺少标签时先创建标签，查找时排除 PR                                |

## 本地故障演练（2026-11-07）

在本机运行构建后的 API（`node apps/api/dist/index.js`），连本地 PostgreSQL 17 容器，依次请求就绪、题库、带 `?token=` 的验证接口和一次用 PIN 的孩子登录，然后停止数据库容器，再请求一遍，最后启动数据库。

| 步骤         | 结果                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 数据库正常   | `/health/ready` 200，`outcome: ok`；验证接口 400，`route` 是 `/api/v1/parents/verification`，没有令牌；孩子登录 401，`client-error` |
| 停止数据库   | 空闲连接断开，记一行 `Database connection unavailable`，`database: application`，`code: 57P01`                                      |
| 数据库停止后 | `/health/ready`、`/api/v1/problems`、孩子登录都返回 503，每个请求一行，`outcome: database`、`code: ECONNREFUSED`，带请求 ID         |
| 数据库恢复后 | `/health/ready` 回到 200                                                                                                            |

日志全文里没有令牌 `secret-token-123`、PIN `583920` 和连接串。停库期间家长和孩子页面拿到的都是 503：草稿保存失败时保留笔迹并显示未同步（`useLessonDraft.test.tsx`“keeps ink on failure, retries it…”），AI 请求失败时转为引导（`useTeachingFeedback.test.tsx`“turns server fallbacks and failures into guidance states…”），不显示虚假成功。

同一天从开发机用健康检查探测真实 staging：`/health/ready` 200，用时约 3.5 秒，包括 Neon 从空闲唤醒；`/version.json` 200，用时约 0.5 秒。探测 `https://alert-drill.invalid` 时两项都报告 `fetch failed`。

## 还没有验证的

- GitHub 上的告警演练：打开和关闭 `staging 告警：health` issue，确认维护者收到通知。工作流进入 main 后，手动运行一次 drill，再不带 drill 运行一次。
- 真实的发布、备份或维护失败触发的告警。
- 供应商故障告警：staging 没有 AI 密钥，账本里没有调用，只由测试覆盖。
- Vercel 运行日志的实际保留时长，以及从 Vercel 控制台按 requestId 查到日志行。
- 生产的监控和告警随 #52 接入。GitHub 定时任务可能推迟，探测不代表大陆设备的访问情况。
