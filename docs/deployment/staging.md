# 隔离 staging：Vercel + Neon

对应 #20、#45、#50、#111、#180、REQ-007/009、ADR-0006/0008/0010/0014。只供合成账号测试，不接收真实家庭/儿童数据；生产不由本流程发布。代码合入、CI 通过与 staging 验收是三个不同状态。

## 资源

| 项目          | 配置                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Vercel 工作区 | juanchaopan1 / `team_6WBQUpNIhHEGrjeEWxoFyN62`，API 返回 Hobby                                        |
| 独立项目      | education-staging / `prj_UYpAbi3rHNsoEdnOYGWiOo8L2WP0`，Node 24；未连接 Git 自动部署；函数区域 sin1   |
| 应用库        | Neon Free 项目 `education-staging`，AWS Asia Pacific (Singapore)；主机由 `STAGING_DATABASE_HOST` 指定 |
| 删除清单库    | 另一个 Neon Free 项目 `education-staging-ledger`，同一区域                                            |
| 备份          | 每日加密备份，存为 GitHub Actions artifact，保留 14 天，见 [备份与恢复](backup.md)                    |
| 告警          | 本仓库带 `staging-alert` 标签的 GitHub issue，见 [运行日志与告警](#运行日志与告警)                    |
| 当前测试地址  | <https://education-access-spike.hyp.app/>                                                             |

Vercel 测试项目关闭默认登录保护，让不携带平台登录 cookie 的候选版本冒烟可以执行；这是公开的测试站，不接收儿童学习资料。验证邮件使用独立配置的 Gmail 凭据，配置与验收见 [家长验证邮件](mail.md)；付费 AI 按 [付费 AI](#付费-ai) 配置，没有配置时家长页的外部 AI 授权逐项显示“暂未启用”。自管账号的服务端会话与权限不受此设置替代。

## 一次性配置

1. 在 Neon 新建两个项目，区域都选 AWS Asia Pacific (Singapore)：`education-staging` 放应用库，`education-staging-ledger` 放删除清单库。清单库必须在另一个项目里，不能是应用库项目的分支或另一个计算端点：同一项目的分支和端点主机不同，但共享这个项目的恢复历史。两个项目只给 staging 用，不放其他业务和真实用户数据：发布流程会修改迁移角色拥有的 `public` 表权限和默认权限。不启用 Neon 的 Data API，账号表只通过应用 API 访问。
2. 在每个项目的 Dashboard → Connect 复制连接串，关闭 Connection pooling，主机里不能有 `-pooler`：本应用的会话级 advisory lock 不兼容事务连接池。把末尾的参数换成只有 `?sslmode=verify-full`，去掉 `sslmode=require` 和 `channel_binding=require`。密码里的特殊字符按 URL 编码。
3. Neon 的证书由公共 CA 签发，不需要下载证书，两个证书秘密留空。保持证书验证，不能改成 no-verify/disable。
4. 在 [GitHub Actions secrets](https://github.com/juanchaopan/education/settings/secrets/actions) 配置服务端秘密；不将值发到聊天或写进 Git。

| Repository secret                 | 内容                                                             |
| --------------------------------- | ---------------------------------------------------------------- |
| `STAGING_VERCEL_TOKEN`            | 能管理上述 staging 项目的 Vercel token，按期更新；不会发往浏览器 |
| `STAGING_DATABASE_URL`            | 应用库的直连连接串，含密码，只带 `?sslmode=verify-full`          |
| `STAGING_DELETION_LEDGER_URL`     | 删除清单库的直连连接串，同样只带 `?sslmode=verify-full`          |
| `STAGING_AUTH_RATE_LIMIT_KEY`     | 密码管理器生成的至少 32 字符随机值，跨部署保持一致               |
| `STAGING_PIN_PEPPER`              | 儿童 PIN 的服务器密钥，见下文 #24                                |
| `STAGING_DATABASE_CA_CERT`        | 留空；只有供应商证书不由公共 CA 签发时才填 PEM 根证书全文        |
| `STAGING_DELETION_LEDGER_CA_CERT` | 同上，对应删除清单库                                             |
| `STAGING_OPENAI_API_KEY`          | 可选，staging 专用的 OpenAI 项目密钥，见 [付费 AI](#付费-ai)     |

5. 在 [Actions variables](https://github.com/juanchaopan/education/settings/variables/actions) 设置 Repository variable **`STAGING_DATABASE_HOST`**：应用库连接串里 `@` 之后、`/` 之前的主机名，形如 `ep-…-xxxxxxxx.ap-southeast-1.aws.neon.tech`，不带端口和数据库名。它必须是只服务这个数据库的直连主机，不能是多个数据库共用的连接池主机，否则同一主机上的其他数据库也能通过检查。它没有默认值。Vercel project/team ID 与域名已有工作流默认值；更换资源时用同名 Repository variables 覆盖 `STAGING_VERCEL_PROJECT_ID`、`STAGING_VERCEL_TEAM_ID`、`STAGING_ORIGIN`。不能将这些变量指向生产。GitHub App 没有读取/设置 Actions secrets 的权限，必须由维护者配置。
6. 资源和上述秘密准备好后，设置 Repository variable **`STAGING_ENABLED=true`**。之后 main 的每个提交在 CI 通过后自动发布，见 [发布流程](#发布流程与失败处理)。首次可在 Actions → staging → Run workflow 运行，输入留空：当前 main 的 CI 已通过时直接发布，否则先派发完整 CI，由 CI 通过后接着发布。不能部署任意分支或跳过 CI。变量未启用时，工作流只写明“未尝试部署”，不是部署成功。
7. 备份的密钥和变量按 [备份与恢复](backup.md) 的“首次设置”配置。
8. 告警不需要另外的秘密，工作流用自带的 `GITHUB_TOKEN` 开关 issue。新告警指派给 Repository variable `STAGING_ALERT_ASSIGNEE` 写的 GitHub 用户名；没有设置时指派给仓库所有者，仓库属于组织时必须设置。GitHub Actions 机器人开的 issue 只通知 Watch 设为 All Activity 的人，被指派则在默认设置下就会通知。维护者在 GitHub 通知设置里开启邮件或 GitHub 应用通知；邮件发往通知设置里选的邮箱，不一定是 Git 提交用的邮箱。

staging 只有合成账号。换数据库时不迁移旧数据，新库在第一次发布时完成迁移；维护者重新注册测试家长和孩子。

## 付费 AI

小兔的解题提示和孩子的语音转写在 staging 上默认关闭。要打开时，在 Actions 的 secrets 和 variables 里配置：

| 名称                                    | 类型              | 内容                                                                 |
| --------------------------------------- | ----------------- | -------------------------------------------------------------------- |
| `STAGING_OPENAI_API_KEY`                | Repository secret | staging 专用的 OpenAI 项目密钥；在 OpenAI 后台给这个项目设好用量上限 |
| `STAGING_OPENAI_TUTORING_ELIGIBLE`      | variable          | `true` 时打开解题提示                                                |
| `STAGING_OPENAI_TRANSCRIPTION_ELIGIBLE` | variable          | `true` 时打开语音转写                                                |
| `STAGING_AI_MONTHLY_BUDGET_USD`         | variable          | 每月计入预算的上限，单位美元；配置了密钥时必须设置                   |

发布流程（`scripts/staging-ai-env.mjs`）把它们作为 `OPENAI_API_KEY`、`OPENAI_TUTORING_ELIGIBLE`、`OPENAI_TRANSCRIPTION_ELIGIBLE`、`AI_MONTHLY_BUDGET_USD` 交给 Vercel 运行时，先按 API 自己的配置规则检查：

- 没有密钥时不传任何 AI 设置，不发请求、不产生费用。
- 有密钥却没有月度上限、开关不是 `true` 或 `false`、金额格式不对时，发布不创建候选。
- 没有标为 `true` 的服务保持关闭。

设置改了以后要再发布一次才生效：Actions → staging → Run workflow，输入留空。资格开关表示部署者确认这项服务可以处理孩子的数据，见 README；staging 是公开的测试站，只用合成账号和编出来的问题测试。家长还要在家长空间分别授权两项服务，孩子的请求才会发出。用量和告警见 [AI 用量](#ai-用量)。

## 数据库连接检查

发布、每日备份、恢复和每小时维护在连接任何数据库之前检查：

- 应用库连接串的主机等于 `STAGING_DATABASE_HOST`，不区分大小写；变量缺少或不一致时失败。
- 两个库都只带 `sslmode=verify-full`，没有其他参数；主机不含 `-pooler.`，端口不是 6543。
- 配置了删除清单库时，它的主机必须不同于应用库。这个检查只比较主机，拦得住把清单写进应用库的配置，但分不出同一 Neon 项目的另一个分支；清单库在另一个项目里，由第 1 步保证。

检查失败时发布不创建候选；备份、恢复和维护打印被拒绝的原因后退出，不改动任何数据。四者通过之后各自持有应用库上的同一把 advisory lock，依次运行，见 [备份与恢复](backup.md#依次运行)。

## 服务开关

应用库里有一张服务开关表 `service_gate`：有一行时服务开放。建表的迁移写入这一行，之后的迁移不碰它；备份不带这一行，所以恢复出来的库一开始是关闭的。关闭时所有 `/api` 请求返回 503“网站正在维护，请稍后再试。”，`/health/ready` 也返回 503；`/health/live` 和 `/version.json` 照常回答。开关按请求匹配到的路由判断，编码过的路径解码后是 API 路由的同样关闭。只有恢复流程在检查通过后打开它。

## 运行日志与告警

### 请求日志

API 对每个请求写一行结构化日志（JSON，Vercel 的运行日志里可见），并在响应头返回同一个 `X-Request-Id`：

| 字段               | 内容                                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| requestId          | 每个请求随机生成，等于响应头 `X-Request-Id`；家长报告问题时可以凭它找到对应的一行                                                                                          |
| method、route      | 请求方法和匹配到的路由模式，例如 `/api/v1/problems/:id/:version/draft`；不记录原始 URL 和查询参数                                                                          |
| status、durationMs | 状态码和服务端耗时                                                                                                                                                         |
| outcome            | `ok`、`client-error`、`rate-limited`、`maintenance`（服务开关关闭或迁移未完成）、`unavailable`（服务没有配置）、`database`（数据库失败，包括就绪检查失败）、`server-error` |
| code               | PostgreSQL 返回的 SQLSTATE、允许列表里的连接错误码、`TIMEOUT` 或框架错误码，其余记为 `UNKNOWN`；查询构造器包裹的驱动错误按里面的原始错误归类                               |
| ai                 | AI 请求的资源、结果、回退原因和来源（规则或 AI），不含孩子的文字、绘图、录音或模型回复                                                                                     |

日志不记录请求头、cookie、请求体、查询参数和异常消息，所以 PIN、注册 KEY、密码、会话令牌、密钥和孩子的输入都不会进入日志。数据库连接空闲时断开，另记一行 `Database connection unavailable`，只带库名和错误码。

失败率和响应时间从这些行统计：按 outcome 计数，按 route 看 durationMs。Vercel Hobby 只短时间保留运行日志，不提供日志导出和告警，保留时长以 Vercel 当前文档为准；需要长期统计时要另接日志服务，目前没有配置。

### AI 用量

每次付费 AI 调用都记在 `ai_usage` 账本里。每小时维护的最后一步汇总上一个整点小时：已结算、无回复、超出范围、未发出或被供应商拒绝、进行中的调用数，token 数和计入预算的金额。汇总只有计数，没有家庭和孩子。维护运行推迟时仍汇总它之前的那个整点小时，只有整次运行没有发生时才会漏掉一个小时。

`staging 告警：ai-provider` 在两种情况下打开：这一小时结束的调用里至少三次、且至少一半没有可用回复（被拒绝、没有回复或超出范围，密钥失效时的整批拒绝也在内）；或者本月有回复超出约定范围，这会暂停本月剩下时间的付费 AI，告警一直保留到下个月。某一小时有调用结束且不满足这两种情况时关闭。一小时里没有结束的调用、付费 AI 也没有暂停时，这一小时说明不了供应商的情况，告警保持原样。

### 告警渠道：GitHub issue

告警来自 `staging-alerts` 工作流和每次 staging 运行的最后一个任务 `alerts`：

- `staging-alerts` 每小时两次，在 :19 和 :49 运行，前一次紧跟每小时维护，那时数据库已经醒着。它用发布时同一个就绪探测检查 `/health/ready`，再读 `/version.json` 的发布版本号，逐个列出请求的 HTTP 状态或“超时，没有回答”，以及耗时。冷启动让请求超过五秒时探测再试，五次都没有就绪才算失败，告警写明几次超时、几次返回 503。
- 每个任务是一个告警来源，例如 `staging/deploy`、`staging-backup/backup`、`staging-mail-retention/cleanup`。任务失败就打开它的告警，并写出失败的步骤；同一个任务下一次成功时关闭。被跳过的任务不改变告警。
- staging 的运行由 `alerts` 任务读取本次运行的任务结果。main 的 CI 派发的发布运行由 GitHub Actions 机器人启动，它结束时不产生能启动其他工作流的事件，所以 staging 自己报告。报告的是有发布任务的运行和准备任务失败的运行；只处理了 PR 检查的运行不报告，准备任务的告警由下一次发布关闭，所以 PR 运行关不掉发布失败的告警。被取消的运行什么都不改。
- staging 没能启动时（例如工作流文件有误），由 PR 检查触发的运行同样启动不了；`staging-alerts` 收到这些运行的结束事件，打开整个 `staging` 的告警，下一次有任务成功的报告关闭它。报告任务本身失败时（例如 GitHub API 不可用），机器人启动的运行没有人收到 GitHub 的失败通知，staging 的故障仍由定时的就绪探测发现。
- 备份、维护和恢复的运行结束后由 `staging-alerts` 读取任务结果。整个运行被跳过或取消时什么都不改；运行没能启动、没有任何任务时，打开整个工作流的告警，下一次有任务成功时关闭。
- 两处报告都调用同一个可复用工作流 `staging-alert-report`。
- 加上就绪探测的 `health` 和 AI 用量的 `ai-provider`，每个来源最多有一个打开的 `staging-alert` issue。第一次失败时打开它并指派给值班的人，GitHub 按这个人的通知设置发邮件或应用通知。持续失败不重复通知，恢复时评论“已恢复”并关闭。
- 每个来源的告警运行各自排队，不同工作流的事件不会互相取代。staging 有发布的运行的报告一次一个，只有准备任务失败的运行的报告另排一队；同一队有好几次在等待时，GitHub 只保留最新的一次，它反映的是更新的状态。
- `STAGING_ENABLED` 不是 `true` 时，定时和手动运行只写明没有探测、没有告警渠道在工作，不能当作告警已经接入。
- 定时和手动运行的 `staging-alerts` 自身失败时（例如 GitHub API 不可用），由 GitHub Actions 的失败通知提醒。

GitHub 的定时任务可能推迟几分钟到几十分钟。探测从 GitHub 的服务器发出，不代表大陆设备能访问。告警只覆盖 staging，生产的监控随 #52 接入。

### 告警演练

在 Actions → staging-alerts → Run workflow 勾选 drill。探测目标换成 `https://alert-drill.invalid`，这个保留域名必然无法解析，真实的探测代码因此失败，打开 `staging 告警：health` 并指派给值班的人。确认收到通知后，不勾选再运行一次，探测通过并关闭它。演练不访问 staging 本身。

## 发布流程与失败处理

1. 三种运行进入 staging 的准备任务。准备任务只检出可信 main，用 API 读取 main 当前的精确 SHA，不等待 CI：
   - **PR 检查完成**（`workflow_run`，监听本仓库 ci、ai-review、commits 在 PR 分支上的成功运行，main 和合并队列上的检查不算）：PR 必须是同仓库、同 head SHA 且已合并 main。main 当前提交还没有 CI 时，以 workflow_dispatch 派发真实 CI。这种运行从不发布，也不把 PR 成功套用到 squash 提交。同一个 PR 的几个检查几乎同时完成时，可能各派发一次 CI；main 的 CI 只保留最新的一次，多出来的那次在几秒内被取消。准备任务不排队：GitHub 在一个队列里只保留最新的等待者，被挤掉的可能正是看到合并的那次检查。
   - **main 的 CI 通过**：CI（push 或派发）的汇总任务 `ci` 成功后，`release-staging` 任务派发 staging，输入是这次 CI 的运行编号。准备任务核对这个运行属于 main 的 `ci.yml`、`ci` 任务成功、它检查的提交仍是 main 的最新提交，然后发布这个提交。main 已经有更新的提交时不发布，由新提交的 CI 发布。
   - **维护者手动运行**，输入留空：main 当前提交的 CI 正在运行时不做事，由它通过后发布；CI 已结束、汇总任务 `ci` 通过时直接发布，即使只有派发发布的那个任务失败；没有 CI 或 `ci` 没有通过时重新派发 CI。

   CI 跑多久都由它自己通过时接着发布，没有等待时限。准备任务仅为派发 CI 获得 actions:write；部署任务仍是 actions:read。部署任务检出准确 SHA 安装/构建；这些步骤不接收部署秘密。发布步骤读取秘密，并再次确认 main 和工作区没有变化。部署任务一次只运行一个，几个同时在等待时 GitHub 只保留最新的那个；main 的 CI 也只保留最新提交的那次，新的 push 或派发会取消正在运行的旧 CI。所以几个 PR 接连合并时只发布最新的、CI 通过的 main 提交，旧的不覆盖新的。

2. 仅上传明确允许的 Git 跟踪源文件；不上传 `.env`、本地文件、证书、测试结果或文档截图。Vercel 运行 `npm run build:staging`，将 SHA 写入构建内的 `release.json`，也写进页面的 `<meta name="education-release">`，已打开的页面据此判断有没有新版本。函数复用容器的 Fastify 组装，无第二套账号实现。SQL 迁移文件及版本文件明确包含在函数产物内；SPA HTML 和散列资源由 Vercel 静态路由提供，不在函数中加载静态服务器插件。
3. 等待候选构建 READY。对应用库和配置了的删除清单库，先撤销迁移角色对托管数据 API 角色 anon/authenticated 的默认表和序列授权（这两个角色存在时），再单独运行迁移，随后对迁移角色拥有的所有 `public` 表启用 RLS 并撤销这两个角色的表权限，之后迁移新增的表也会自动包括在内；供应商或扩展拥有的表不在其中。运行时凭据只交服务端。
4. 对精确候选 URL 检查版本（`/version.json` 和页面写的版本都是这次的 SHA，页面 `no-cache`）、数据库就绪、注册、登录、读取会话、退出和旧 cookie 拒绝。服务开关关闭时就绪检查失败，不发布。仅生成随机 `@example.invalid` 合成账号，不发送邮件。finally 定向删除该账号所属且没有其他成员的测试家庭；失败时不清空其他账号或限流表。网络故障后需核对是否有未完成的合成账号清理。
5. 再确认 main 没有更新，才将自定义测试域名 alias 指向候选，并从 API 读回实际 deployment/project ID。记录准确 SHA、deployment ID 和请求耗时。候选页面在切换前的写请求以已配置 staging Origin 检查；它不作为独立 PR 页面使用。

构建、迁移、冒烟或过期提交失败不修改稳定 alias，删除本次失败候选。alias 提交发生超时/失败时结果可能不确定，保留候选并人工查询 alias，不能自动删除可能已在服务的版本。

强制取消 runner、工作流超时或创建请求的响应丢失时，可能留下未推广候选；按 Vercel 的提交元数据确认后人工清理，不能删除当前 alias 正在使用的版本。

失败部署保留上一应用版本，但不能撤销已经执行的数据库迁移。只使用向后兼容迁移；需要回到更早的数据时，按 [备份与恢复](backup.md) 恢复备份。

## PR 预览与免费约束

Vercel 支持 PR 预览，Neon Free 每个项目也能建少量数据库分支，但逐 PR 创建和清理分支需要另外的凭据和清理流程，目前没有配置，因此本配置**不创建 PR 数据库/预览**，使用隔离 staging。不能让 PR 复用 staging 或生产连接串，也不在 `pull_request_target` 中执行 PR 代码。

以后若采用有独立空库、凭据和关闭清理能力的资源，再另行启用 PR 预览。当前没有预览资源，因此不存在待自动清理的 PR 数据库。

## Neon Free 的额度与空闲

额度见 [ADR-0014](../adr/0014-neon-databases.md)。对 staging 的影响：

- 空闲 5 分钟后计算暂停，下一次连接唤醒约几百毫秒。发布时迁移先唤醒数据库；发布前和告警的就绪探测对 503 和超时重试。
- 计算时间或数据传输用完时项目暂停到下个计费周期，存储超出后不能写入；发布、备份和维护会因连接或写入失败而失败，就绪检查失败会打开告警。用量在 Neon 控制台查看，不配置保活流量。
- Neon 自带的恢复窗口（Free 为 6 小时）不是独立备份；staging 的每日备份和恢复见 [备份与恢复](backup.md)。生产备份及大陆完整链路由 #51/#52 验收。

## 上线前实际验收

- 本地真实双实例场景中 A 为容器入口、B 为部署用函数处理器；仍不能替代真正 Vercel 的打包、冷启动、数据库 TLS/会话锁及重启持久化测试。
- main 自动发布、Singapore 实际区域、账号冒烟、域名推广和真实浏览器跨部署持久登录的验收见 [#20 证据](../evidence/20/README.md)；Neon 数据库上的发布、家庭删除和每小时维护见 [#111 验收记录](../evidence/111/README.md)；备份和恢复演练见 [#45 验收记录](../evidence/45/README.md)；请求日志、告警和演练见 [#50 验收记录](../evidence/50/README.md)。合并后由 main 的 CI 接着发布、不需要手动运行的实际验收记在 #180。
- 本流程不信任客户端转发 IP。Vercel 中默认看到的代理来源可能聚合用户，限流会保守拒绝；平台可信来源和池大小（每函数最多 4 连接）、冷启动、Argon2/RSS 与目标资源容量必须实际测量，未宣称两秒达标。
- HTML 重新验证、版本接口 no-store、散列资源可缓存。已打开的页面检查新版本、先保存草稿再刷新，做法和浏览器检查见 [#118 验收记录](../evidence/118/README.md)；在真实 staging 上跨两次发布的验收列在那里的未完成项。
- Vercel Hobby 详细资格/配额、Gmail 条款/额度正文无法从本开发环境读取，没有据此填入数字或断言服务不可达；Gmail 保持隔离适配器，回执明确 `mail: not-sent`。无后台真实发信、AI 调用或儿童输入。

## 撤回

关闭 `STAGING_ENABLED` 可停止后续自动部署、备份、维护和告警探测。将 staging alias 恢复至已记录的上一可用 deployment，并核对 `/version.json`。不要仅 revert Git 就宣称已回滚线上；不要删除 Neon 项目或执行全库清理来撤回应用。初始旧探针为 `dpl_4HWHQJKv6nUYfwR6zfAP5nvVoL4G`，它不是正式账号应用；staging 有持久数据后，应选择兼容同一数据库的应用版本。

只停掉 staging 的付费 AI 时，删除 `STAGING_OPENAI_API_KEY` 或把两个资格开关改成 `false`，再发布一次；在 OpenAI 后台吊销这个密钥则立即生效。

官方来源及日期、实际验证和未完成项见 [#20 证据](../evidence/20/README.md)。

## 自动合并与 GitHub 事件

GitHub 官方说明 GITHUB_TOKEN 引发的事件不会启动新的工作流，workflow_dispatch/repository_dispatch 是例外。自动合并以 GitHub Actions 机器人的身份完成，所以合并到 main 的 push 不启动 CI；机器人派发的 CI 运行结束时，也不会启动监听它的 `workflow_run`。因此发布链的每一步都用派发：PR 完成事件解析已合并的 PR 后派发 main CI，main CI 通过后派发 staging，staging 的运行自己报告告警。未合并、外仓库、旧 SHA、待完成或失败检查均不能进入发布。手动 staging 可在失败后重新运行完整 CI，自动事件不重跑失败的检查。

原生自动合并可能晚于所需检查完成。PR 完成事件每五秒核对关联 PR，最多等待两分钟，只有同仓库、同 head SHA 且已合并 main 才继续；一直未合并则不派发 CI、不部署。超过此窗口才合并时，下一个 PR 的检查完成会为当时的 main 派发 CI；没有其他 PR 时需手动运行 staging，不能将等待超时当成发布成功。main 的 CI 通过后派发的发布运行丢失时（例如 GitHub 故障），PR 检查不补发，同样需手动运行 staging。准备任务最多五分钟。

发布错误以转义后的 GitHub annotation 输出，便于在日志下载受限时通过 API 读取原因，不输出秘密值。

## Singapore 函数与数据库

Vercel 函数固定 Singapore/sin1，两个 Neon 项目也在 Singapore。Vercel 项目的函数默认区域须设为 sin1；仅看版本配置文件不能替代实际 deployment 的 regions 读回。

函数连接建立预算为 3 秒，本地/容器为 1 秒；SQL 语句超时 3 秒。不能据此宣称已满足大陆设备两秒目标。数据库错误只记录 PostgreSQL 的 SQLSTATE、允许列表中的连接错误码或 TIMEOUT/UNKNOWN，不记录原始异常消息、连接串、密码或证书。

发布前和告警的只读就绪探测至多五次，每次最多五秒（响应体也在这五秒内），间隔一秒。明确的 503 和超时会再试：冷启动时这个请求平常要 2–4 秒，偶尔超过五秒。HTTP 200 还须匹配 ready 响应；五次都没有就绪、其他 HTTP 错误和其他网络失败均不发布，错误写明几次超时、几次返回 503。注册、登录、退出不重试。每个请求在响应体到齐后才记录 HTTP 状态和耗时，超时记为超时，失败样本不能计为成功延迟。

## #21 邮件配置

真实发信独立受控，默认关闭；配置、供应商核实和正式验收步骤见 [家长验证邮件](mail.md)。即使启用，发布中的合成账号冒烟也不会调用 Gmail；注册本身不发信。新表随迁移启用 RLS 并撤销 anon/authenticated 权限。

## #24 儿童 PIN 密钥

在 Actions Secrets 配置 `STAGING_PIN_PEPPER`：独立生成 32 随机字节并编码为 64 位十六进制。发布流程将其传入 Vercel runtime 的 `PIN_PEPPER`，缺失或格式错误不创建候选；不传入前端或构建环境。密钥跨部署保持一致并安全备存，不能为了发布或排错随意更换。孩子自己设置的六位 PIN 与这个服务器密钥不同。迁移和真实注册验收见 [#24](../evidence/24/README.md)。

## #44 家庭删除清单库

家庭删除先写入独立的删除清单库，再删除应用库里的家庭，见 [#44 验收记录](../evidence/44/README.md)。staging 的清单库是 Neon 项目 `education-staging-ledger`，按上文配置 `STAGING_DELETION_LEDGER_URL`。没有配置这个秘密时，发布和维护照常运行，网站不提供家庭删除，也不能恢复备份。

配置后，每次发布像应用库一样处理清单库：先撤销默认授权，运行清单迁移，再启用 RLS 并撤销 anon/authenticated 的表权限，最后把清单库的两个变量传给 Vercel 运行时。清单库与应用库同主机时发布失败。每小时的 `staging-mail-retention` 任务在清理邮件和过期草稿之后运行 API 的维护命令：完成仍在处理中的删除，再删去完成已超过 15 天的清单条目，这时已没有可恢复的备份还含有这些家庭。有删不掉的家庭时任务失败并打印完成和失败的数量，下次运行重试。
