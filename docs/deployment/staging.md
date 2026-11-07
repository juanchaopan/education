# 隔离 staging：Vercel + Neon

对应 #20、#45、#111、REQ-007/009、ADR-0006/0008/0010/0014。只供合成账号测试，不接收真实家庭/儿童数据；生产不由本流程发布。代码合入、CI 通过与 staging 验收是三个不同状态。

## 资源

| 项目          | 配置                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Vercel 工作区 | juanchaopan1 / `team_6WBQUpNIhHEGrjeEWxoFyN62`，API 返回 Hobby                                        |
| 独立项目      | education-staging / `prj_UYpAbi3rHNsoEdnOYGWiOo8L2WP0`，Node 24；未连接 Git 自动部署；函数区域 sin1   |
| 应用库        | Neon Free 项目 `education-staging`，AWS Asia Pacific (Singapore)；主机由 `STAGING_DATABASE_HOST` 指定 |
| 删除清单库    | 另一个 Neon Free 项目 `education-staging-ledger`，同一区域                                            |
| 备份          | 每日加密备份，存为 GitHub Actions artifact，保留 14 天，见 [备份与恢复](backup.md)                    |
| 当前测试地址  | <https://education-access-spike.hyp.app/>                                                             |

Vercel 测试项目关闭默认登录保护，让不携带平台登录 cookie 的候选版本冒烟可以执行；这是公开的测试站，不接收儿童学习资料。验证邮件使用独立配置的 Gmail 凭据，配置与验收见 [家长验证邮件](mail.md)；没有 AI 凭据。自管账号的服务端会话与权限不受此设置替代。

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

5. 在 [Actions variables](https://github.com/juanchaopan/education/settings/variables/actions) 设置 Repository variable **`STAGING_DATABASE_HOST`**：应用库连接串里 `@` 之后、`/` 之前的主机名，形如 `ep-…-xxxxxxxx.ap-southeast-1.aws.neon.tech`，不带端口和数据库名。它必须是只服务这个数据库的直连主机，不能是多个数据库共用的连接池主机，否则同一主机上的其他数据库也能通过检查。它没有默认值。Vercel project/team ID 与域名已有工作流默认值；更换资源时用同名 Repository variables 覆盖 `STAGING_VERCEL_PROJECT_ID`、`STAGING_VERCEL_TEAM_ID`、`STAGING_ORIGIN`。不能将这些变量指向生产。GitHub App 没有读取/设置 Actions secrets 的权限，必须由维护者配置。
6. 资源和上述秘密准备好后，设置 Repository variable **`STAGING_ENABLED=true`**。之后每次 main 的 `ci` 成功会自动触发；首次可在 Actions → staging → Run workflow 运行。首次手动触发时，如当前 main 尚无 CI，会先显式派发完整 CI；staging 准备任务会有界等待 CI 成功，再在同一次运行中继续发布，不依赖递归完成回调。不能部署任意分支或跳过 CI。变量未启用时，工作流只写明“未尝试部署”，不是部署成功。
7. 备份的密钥和变量按 [备份与恢复](backup.md) 的“首次设置”配置。

staging 只有合成账号。换数据库时不迁移旧数据，新库在第一次发布时完成迁移；维护者重新注册测试家长和孩子。

## 数据库连接检查

发布、每日备份、恢复和每小时维护在连接任何数据库之前检查：

- 应用库连接串的主机等于 `STAGING_DATABASE_HOST`，不区分大小写；变量缺少或不一致时失败。
- 两个库都只带 `sslmode=verify-full`，没有其他参数；主机不含 `-pooler.`，端口不是 6543。
- 配置了删除清单库时，它的主机必须不同于应用库。这个检查只比较主机，拦得住把清单写进应用库的配置，但分不出同一 Neon 项目的另一个分支；清单库在另一个项目里，由第 1 步保证。

检查失败时发布不创建候选；备份、恢复和维护打印被拒绝的原因后退出，不改动任何数据。四者通过之后各自持有应用库上的同一把 advisory lock，依次运行，见 [备份与恢复](backup.md#依次运行)。

## 服务开关

应用库里有一张服务开关表 `service_gate`：有一行时服务开放。建表的迁移写入这一行，之后的迁移不碰它；备份不带这一行，所以恢复出来的库一开始是关闭的。关闭时所有 `/api` 请求返回 503“网站正在维护，请稍后再试。”，`/health/ready` 也返回 503；`/health/live` 和 `/version.json` 照常回答。开关按请求匹配到的路由判断，编码过的路径解码后是 API 路由的同样关闭。只有恢复流程在检查通过后打开它。

## 发布流程与失败处理

1. `workflow_run` 监听本仓库 ci、ai-review、commits 的成功运行；PR 事件必须关联到已经合并 main 的同仓库、同 head SHA。准备任务只检出可信 main，用 API 选择当前 main 的精确 SHA；缺少检查时以 workflow_dispatch 显式派发真实 CI，正在运行或失败时不发布，也不把 PR 成功套用到 squash 提交。准备任务仅为派发 CI 获得 actions:write；部署任务仍是 actions:read。main 的 push 或显式派发 CI 成功后，才检出准确 SHA 安装/构建；这些步骤不接收部署秘密。发布步骤读取秘密，并再次确认 main 和工作区没有变化。
2. 仅上传明确允许的 Git 跟踪源文件；不上传 `.env`、本地文件、证书、测试结果或文档截图。Vercel 运行 `npm run build:staging`，将 SHA 写入构建内的 `release.json`。函数复用容器的 Fastify 组装，无第二套账号实现。SQL 迁移文件及版本文件明确包含在函数产物内；SPA HTML 和散列资源由 Vercel 静态路由提供，不在函数中加载静态服务器插件。
3. 等待候选构建 READY。对应用库和配置了的删除清单库，先撤销迁移角色对托管数据 API 角色 anon/authenticated 的默认表和序列授权（这两个角色存在时），再单独运行迁移，随后对迁移角色拥有的所有 `public` 表启用 RLS 并撤销这两个角色的表权限，之后迁移新增的表也会自动包括在内；供应商或扩展拥有的表不在其中。运行时凭据只交服务端。
4. 对精确候选 URL 检查版本、数据库就绪、注册、登录、读取会话、退出和旧 cookie 拒绝。服务开关关闭时就绪检查失败，不发布。仅生成随机 `@example.invalid` 合成账号，不发送邮件。finally 定向删除该账号所属且没有其他成员的测试家庭；失败时不清空其他账号或限流表。网络故障后需核对是否有未完成的合成账号清理。
5. 再确认 main 没有更新，才将自定义测试域名 alias 指向候选，并从 API 读回实际 deployment/project ID。记录准确 SHA、deployment ID 和请求耗时。候选页面在切换前的写请求以已配置 staging Origin 检查；它不作为独立 PR 页面使用。

构建、迁移、冒烟或过期提交失败不修改稳定 alias，删除本次失败候选。alias 提交发生超时/失败时结果可能不确定，保留候选并人工查询 alias，不能自动删除可能已在服务的版本。

强制取消 runner、工作流超时或创建请求的响应丢失时，可能留下未推广候选；按 Vercel 的提交元数据确认后人工清理，不能删除当前 alias 正在使用的版本。

失败部署保留上一应用版本，但不能撤销已经执行的数据库迁移。只使用向后兼容迁移；需要回到更早的数据时，按 [备份与恢复](backup.md) 恢复备份。

## PR 预览与免费约束

Vercel 支持 PR 预览，Neon Free 每个项目也能建少量数据库分支，但逐 PR 创建和清理分支需要另外的凭据和清理流程，目前没有配置，因此本配置**不创建 PR 数据库/预览**，使用隔离 staging。不能让 PR 复用 staging 或生产连接串，也不在 `pull_request_target` 中执行 PR 代码。

以后若采用有独立空库、凭据和关闭清理能力的资源，再另行启用 PR 预览。当前没有预览资源，因此不存在待自动清理的 PR 数据库。

## Neon Free 的额度与空闲

额度见 [ADR-0014](../adr/0014-neon-databases.md)。对 staging 的影响：

- 空闲 5 分钟后计算暂停，下一次连接唤醒约几百毫秒。发布时迁移先唤醒数据库；发布前的就绪探测对 503 重试。
- 计算时间或数据传输用完时项目暂停到下个计费周期，存储超出后不能写入；发布、备份和维护会因连接或写入失败而失败。用量在 Neon 控制台查看，不配置保活流量。
- Neon 自带的恢复窗口（Free 为 6 小时）不是独立备份；staging 的每日备份和恢复见 [备份与恢复](backup.md)。生产备份及大陆完整链路由 #51/#52 验收。

## 上线前实际验收

- 本地真实双实例场景中 A 为容器入口、B 为部署用函数处理器；仍不能替代真正 Vercel 的打包、冷启动、数据库 TLS/会话锁及重启持久化测试。
- main 自动发布、Singapore 实际区域、账号冒烟、域名推广和真实浏览器跨部署持久登录的验收见 [#20 证据](../evidence/20/README.md)；Neon 数据库上的发布、家庭删除和每小时维护见 [#111 验收记录](../evidence/111/README.md)；备份和恢复演练见 [#45 验收记录](../evidence/45/README.md)。
- 本流程不信任客户端转发 IP。Vercel 中默认看到的代理来源可能聚合用户，限流会保守拒绝；平台可信来源和池大小（每函数最多 4 连接）、冷启动、Argon2/RSS 与目标资源容量必须实际测量，未宣称两秒达标。
- HTML 重新验证、版本接口 no-store、散列资源可缓存。已打开页面保存草稿后自动刷新由 #47 完成，不能把版本文件当成整个更新策略已经实现。
- Vercel Hobby 详细资格/配额、Gmail 条款/额度正文无法从本开发环境读取，没有据此填入数字或断言服务不可达；Gmail 保持隔离适配器，回执明确 `mail: not-sent`。无后台真实发信、AI 调用或儿童输入。

## 撤回

关闭 `STAGING_ENABLED` 可停止后续自动部署、备份和维护。将 staging alias 恢复至已记录的上一可用 deployment，并核对 `/version.json`。不要仅 revert Git 就宣称已回滚线上；不要删除 Neon 项目或执行全库清理来撤回应用。初始旧探针为 `dpl_4HWHQJKv6nUYfwR6zfAP5nvVoL4G`，它不是正式账号应用；staging 有持久数据后，应选择兼容同一数据库的应用版本。

官方来源及日期、实际验证和未完成项见 [#20 证据](../evidence/20/README.md)。

## 自动合并与 GitHub 事件

GitHub 官方说明 GITHUB_TOKEN 引发的普通事件不会递归启动工作流，workflow_dispatch/repository_dispatch 是例外。PR #60 的 bot squash 合并已实际出现 main 无 push CI 的情况；不能只等 push。可信工作流通过完成事件解析已合并 PR，再显式派发 main CI；未合并、外仓库、旧 SHA、待完成或失败检查均不能直接进入发布。手动 staging 可在失败后重试完整 CI，自动事件不循环重跑失败检查。

原生自动合并可能晚于所需检查完成。PR 完成事件每五秒核对关联 PR，最多等待两分钟，只有同仓库、同 head SHA 且已合并 main 才继续；一直未合并则不派发 CI、不部署。超过此窗口才合并的异常情况需手动运行 staging，不能将等待超时当成发布成功。

准备任务随后等待 CI 最多十分钟，整个准备 job 最多十五分钟。检查失败、超时或等待期间 main 更新均不发布。手动重试会区分旧失败 run 与新 run，不能在新检查出现之前误用旧结果。发布错误以转义后的 GitHub annotation 输出，便于在日志下载受限时通过 API 读取原因，不输出秘密值。

## Singapore 函数与数据库

Vercel 函数固定 Singapore/sin1，两个 Neon 项目也在 Singapore。Vercel 项目的函数默认区域须设为 sin1；仅看版本配置文件不能替代实际 deployment 的 regions 读回。

函数连接建立预算为 3 秒，本地/容器为 1 秒；SQL 语句超时 3 秒。不能据此宣称已满足大陆设备两秒目标。数据库错误只记录允许列表中的代码或 TIMEOUT/UNKNOWN，不记录原始异常消息、连接串、密码或证书。

发布前的只读就绪探测至多五次，每次最多五秒，间隔一秒；只有明确的 503 才重试。HTTP 200 还须匹配 ready 响应；持续失败、其他 HTTP 错误和网络失败均不发布。注册、登录、退出不重试。耗时记录包含 HTTP 状态，失败样本不能计为成功延迟。

## #21 邮件配置

真实发信独立受控，默认关闭；配置、供应商核实和正式验收步骤见 [家长验证邮件](mail.md)。即使启用，发布中的合成账号冒烟也不会调用 Gmail；注册本身不发信。新表随迁移启用 RLS 并撤销 anon/authenticated 权限。

## #24 儿童 PIN 密钥

在 Actions Secrets 配置 `STAGING_PIN_PEPPER`：独立生成 32 随机字节并编码为 64 位十六进制。发布流程将其传入 Vercel runtime 的 `PIN_PEPPER`，缺失或格式错误不创建候选；不传入前端或构建环境。密钥跨部署保持一致并安全备存，不能为了发布或排错随意更换。孩子自己设置的六位 PIN 与这个服务器密钥不同。迁移和真实注册验收见 [#24](../evidence/24/README.md)。

## #44 家庭删除清单库

家庭删除先写入独立的删除清单库，再删除应用库里的家庭，见 [#44 验收记录](../evidence/44/README.md)。staging 的清单库是 Neon 项目 `education-staging-ledger`，按上文配置 `STAGING_DELETION_LEDGER_URL`。没有配置这个秘密时，发布和维护照常运行，网站不提供家庭删除，也不能恢复备份。

配置后，每次发布像应用库一样处理清单库：先撤销默认授权，运行清单迁移，再启用 RLS 并撤销 anon/authenticated 的表权限，最后把清单库的两个变量传给 Vercel 运行时。清单库与应用库同主机时发布失败。每小时的 `staging-mail-retention` 任务在清理邮件和过期草稿之后运行 API 的维护命令：完成仍在处理中的删除，再删去完成已超过 15 天的清单条目，这时已没有可恢复的备份还含有这些家庭。有删不掉的家庭时任务失败并打印完成和失败的数量，下次运行重试。
