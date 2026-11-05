# 隔离 staging：Vercel + Supabase

对应 #20、REQ-007/009、ADR-0006/0008/0010。只供合成账号测试，不接收真实家庭/儿童数据；生产不由本流程发布。代码合入、CI 通过与 staging 验收是三个不同状态。

## 已准备的资源

| 项目          | 配置                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Vercel 工作区 | juanchaopan1 / `team_6WBQUpNIhHEGrjeEWxoFyN62`，API 返回 Hobby                                                               |
| 独立项目      | education-staging / `prj_UYpAbi3rHNsoEdnOYGWiOo8L2WP0`，Node 24；未连接 Git 自动部署                                         |
| 数据库        | 维护者指定 Supabase 项目 `telkaiyxprpetmqthyhn`；us-east-1（维护者确认）；项目保持不变，Vercel 按用户要求固定 Singapore/sin1 |
| 当前测试地址  | <https://education-access-spike.hyp.app/>；已完成 Singapore 账号候选的发布与域名读回，详见验收记录                           |

Vercel 测试项目关闭默认登录保护，让不携带平台登录 cookie 的候选版本冒烟可以执行；这是公开的测试站，不接收儿童学习资料。验证邮件使用独立配置的 Gmail 凭据，配置与验收见 [家长验证邮件](mail.md)；没有 AI 凭据。自管账号的服务端会话与权限不受此设置替代。

## 一次性配置

1. 确认 Supabase 是本项目专用的 staging 项目，没有其他业务和真实用户数据。此流程会修改本项目 `public` 应用表权限和当前迁移角色的默认权限，不能指向共用/生产项目。
2. Supabase Dashboard → Connect → **Session pooler**，复制 PostgreSQL 连接串，端口 **5432**，填入实际密码。密码中的特殊字符须按 URL 编码；使用 `?sslmode=verify-full`。本应用的会话级 advisory lock 不兼容 Transaction pooler/6543。IPv6 直连也可用，但 GitHub runner 未必有 IPv6；推荐 Session pooler。
3. 从 Supabase Database settings 的 SSL 区域下载该项目根证书；本项目实际连接已出现 self-signed certificate in certificate chain，必须将下载的 PEM 全文放进下表证书配置。保持证书验证，不能改用 no-verify/disable。
4. 在 [GitHub Actions secrets](https://github.com/juanchaopan/education/settings/secrets/actions) 配置服务端秘密；这里不使用 ChatGPT 环境中的秘密绑定，也不将值发到聊天或写进 Git。

| Repository secret             | 内容                                                             |
| ----------------------------- | ---------------------------------------------------------------- |
| `STAGING_VERCEL_TOKEN`        | 能管理上述 staging 项目的 Vercel token，按期更新；不会发往浏览器 |
| `STAGING_DATABASE_URL`        | 上述专用 Supabase PostgreSQL 连接串，含密码、5432、verify-full   |
| `STAGING_AUTH_RATE_LIMIT_KEY` | 密码管理器生成的至少 32 字符随机值，跨部署保持一致               |
| `STAGING_DATABASE_CA_CERT`    | 本项目必需：Supabase 下载的 PEM 根证书全文；不是数据库密码       |

项目编号、Vercel project/team ID 与域名已有工作流默认值；如更换资源，可通过同名 Repository variables 覆盖 `STAGING_SUPABASE_PROJECT_REF`、`STAGING_VERCEL_PROJECT_ID`、`STAGING_VERCEL_TEAM_ID`、`STAGING_ORIGIN`。不能将这些变量指向生产。GitHub App 当前无读取/设置 Actions secrets 的权限，必须由维护者安全配置。

5. 代码审查合入 main、资源和上述秘密准备好后，在 [Actions variables](https://github.com/juanchaopan/education/settings/variables/actions) 设置 Repository variable **`STAGING_ENABLED=true`**。之后每次 main 的 `ci` 成功会自动触发；首次可在 Actions → staging → Run workflow 运行。首次手动触发时，如当前 main 尚无 CI，会先显式派发完整 CI；当前 staging 准备任务会有界等待 CI 成功，再在同一次运行中继续发布，不依赖递归完成回调。不能部署任意分支或跳过 CI。变量未启用时，工作流只写明“未尝试部署”，不是部署成功。

## 发布流程与失败处理

1. `workflow_run` 监听本仓库 ci、ai-review、commits 的成功运行；PR 事件必须关联到已经合并 main 的同仓库、同 head SHA。准备任务只检出可信 main，用 API 选择当前 main 的精确 SHA；缺少检查时以 workflow_dispatch 显式派发真实 CI，正在运行或失败时不发布，也不把 PR 成功套用到 squash 提交。准备任务仅为派发 CI 获得 actions:write；部署任务仍是 actions:read。main 的 push 或显式派发 CI 成功后，才检出准确 SHA 安装/构建；这些步骤不接收部署秘密。发布步骤读取秘密，并再次确认 main 和工作区没有变化。
2. 仅上传明确允许的 Git 跟踪源文件；不上传 `.env`、本地文件、证书、测试结果或文档截图。Vercel 运行 `npm run build:staging`，将 SHA 写入构建内的 `release.json`。函数复用容器的 Fastify 组装，无第二套账号实现。SQL 迁移文件及版本文件明确包含在函数产物内；SPA HTML 和散列资源由 Vercel 静态路由提供，不在函数中加载静态服务器插件。
3. 等待候选构建 READY。先撤销迁移角色对 anon/authenticated 的默认表和序列授权，再单独运行迁移，随后对七张应用表启用 RLS 并撤销两角色的表权限。匿名 Supabase Data API 不能代替应用 API 访问账号表；运行时凭据只交服务端。
4. 对精确候选 URL 检查版本、数据库就绪、注册、登录、读取会话、退出和旧 cookie 拒绝。仅生成随机 `@example.invalid` 合成账号，不发送邮件。finally 定向删除该账号所属且没有其他成员的测试家庭；失败时不清空其他账号或限流表。网络故障后需核对是否有未完成的合成账号清理。
5. 再确认 main 没有更新，才将自定义测试域名 alias 指向候选，并从 API 读回实际 deployment/project ID。记录准确 SHA、deployment ID 和请求耗时。候选页面在切换前的写请求以已配置 staging Origin 检查；它不作为独立 PR 页面使用。

构建、迁移、冒烟或过期提交失败不修改稳定 alias，删除本次失败候选。alias 提交发生超时/失败时结果可能不确定，保留候选并人工查询 alias，不能自动删除可能已在服务的版本。首次从探针项目迁移域名若被 Vercel 要求域名验证，按其实际返回处理；不能在验证成功前删除旧探针、移走 DNS 或报告新站上线。

强制取消 runner、工作流超时或创建请求的响应丢失时，可能留下未推广候选；按 Vercel 的提交元数据确认后人工清理，不能删除当前 alias 正在使用的版本。

失败部署保留上一应用版本，但不能撤销已经执行的数据库迁移。只使用向后兼容迁移；此任务未新增业务表迁移。数据库备份和破坏性变更恢复仍属后续验收。

## PR 预览与免费约束

Vercel 支持 PR 预览，但当前选用的 Supabase 分支文档明确按分支计算资源用量，且分支不受 Spend Cap 保护。未获付费基础设施授权，也没有逐 PR 独立数据库的免费生命周期凭据，因此本配置**不创建 PR 数据库/预览**，按 #20 的退路使用隔离 staging。不能让 PR 复用 staging 或生产连接串，也不在 `pull_request_target` 中执行 PR 代码。

以后若采用有独立空库、凭据和关闭清理能力的资源，再另行启用 PR 预览。不能把“Vercel 支持”表述为当前项目已经具备安全的免费预览。当前没有预览资源，因此不存在待自动清理的 PR 数据库。

## 上线前实际验收

- 本地真实双实例场景中 A 为容器入口、B 为部署用函数处理器；仍不能替代真正 Vercel 的打包、冷启动、Supabase TLS/会话锁及重启持久化测试。
- main 合并后的自动 staging 运行 41976030636 已完成精确 main CI、迁移、账号冒烟和域名推广，实际部署 regions 为 sin1；逐 PR 预览按上述资源限制使用隔离 staging 退路。
- 已记录首个 Singapore 发布的 READY、版本 SHA、账号冒烟和 alias 读回；维护者用真实浏览器验证注册、登录和刷新，并在同数据库重新部署、域名切换到不同 deployment 后确认仍保持登录，退出和原密码重新登录也成功。运行编号和边界见证据；没有拿临时新数据库作持久化证明。
- 本次未信任客户端转发 IP。Vercel 中默认看到的代理来源可能聚合用户，限流会保守拒绝；平台可信来源和池大小（每函数最多 4 连接）、冷启动、Argon2/RSS 与目标资源容量必须实际测量，未宣称两秒达标。
- HTML 重新验证、版本接口 no-store、散列资源可缓存。已打开页面保存草稿后自动刷新仍由 #47 完成，不能把版本文件当成整个更新策略已经实现。
- Vercel 当前 Hobby 详细资格/配额、Gmail 当前条款/额度正文仍被本开发环境代理拒绝。没有据此填入数字或断言服务不可达；Gmail 继续保持隔离适配器，回执明确 `mail: not-sent`。无后台真实发信、AI 调用或儿童输入。
- Supabase Free 的低活跃项目可能暂停；不承诺常驻、免费备份或长期零费用。恢复后重新验就绪与账号；不配置保活流量规避套餐规则。生产备份、恢复及大陆完整链路另由 #29/#45/#51/#52 验收。

## 撤回

关闭 `STAGING_ENABLED` 可停止后续自动部署。将 staging alias 恢复至已记录的上一可用 deployment，并核对 `/version.json`。不要仅 revert Git 就宣称已回滚线上；不要删除 Supabase 项目或执行全库清理来撤回应用。初始旧探针为 `dpl_4HWHQJKv6nUYfwR6zfAP5nvVoL4G`，它不是正式账号应用；一旦新 staging 产生持久数据，应选择兼容同一数据库的应用版本。

官方来源及日期、实际验证和未完成项见 [#20 证据](../evidence/20/README.md)。

## 自动合并与 GitHub 事件

GitHub 官方说明 GITHUB_TOKEN 引发的普通事件不会递归启动工作流，workflow_dispatch/repository_dispatch 是例外。PR #60 的 bot squash 合并已实际出现 main 无 push CI 的情况；不能只等 push。当前通过可信工作流完成事件解析已合并 PR，再显式派发 main CI；未合并、外仓库、旧 SHA、待完成或失败检查均不能直接进入发布。手动 staging 可在失败后重试完整 CI，自动事件不循环重跑失败检查。

原生自动合并可能晚于所需检查完成。PR 完成事件每五秒核对关联 PR，最多等待两分钟，只有同仓库、同 head SHA 且已合并 main 才继续；一直未合并则不派发 CI、不部署。超过此窗口才合并的异常情况需手动运行 staging，不能将等待超时当成发布成功。

准备任务随后等待 CI 最多十分钟，整个准备 job 最多十五分钟。检查失败、超时或等待期间 main 更新均不发布。手动重试会区分旧失败 run 与新 run，不能在新检查出现之前误用旧结果。发布错误以转义后的 GitHub annotation 输出，便于在日志下载受限时通过 API 读取原因，不输出秘密值。

## Singapore 函数与现有美国数据库

维护者明确保留 Supabase 项目 `telkaiyxprpetmqthyhn`（us-east-1），Vercel 固定 Singapore/sin1，不要求新建或迁移 Supabase。Vercel 项目的函数默认区域也须设为 sin1；仅看版本配置文件不能替代实际 deployment 的 regions 读回。

函数连接建立预算为 3 秒，本地/容器仍为 1 秒；SQL 语句超时保持 3 秒。跨区增加耗时，不能因此宣称已满足大陆设备两秒目标。数据库错误只记录允许列表中的代码或 TIMEOUT/UNKNOWN，不记录原始异常消息、连接串、密码或证书。

发布前的只读就绪探测至多五次，每次最多五秒，间隔一秒；只有明确的 503 才重试。HTTP 200 还须匹配 ready 响应；持续失败、其他 HTTP 错误和网络失败均不发布。注册、登录、退出不重试。耗时记录包含 HTTP 状态，失败样本不能计为成功延迟。

自定义域名曾仍归属旧探针项目，GitHub 发布 token 的 alias 请求返回 403。已通过 Vercel 官方 moveProjectDomain 原子接口将该子域名转交 education-staging，并保留原已验证 deployment 指向。运行 41975178909 随后使用 GitHub Actions 的 token 完成 Singapore 候选的迁移、账号冒烟和 alias 发布，API 读回与候选一致；此前的手工恢复不计作这次自动发布证据。Alias 错误可显示公共域名的提供商原因，包含环境变量的 deployment 错误仍只输出 HTTP 摘要。

## #21 邮件配置

真实发信独立受控，默认关闭；配置、供应商核实和正式验收步骤见 [家长验证邮件](mail.md)。即使后续启用，发布中的合成账号冒烟也不会调用 Gmail；注册本身不发信。新表随迁移启用 RLS 并撤销 anon/authenticated 权限。

## #24 儿童 PIN 密钥

在 Actions Secrets 配置 `STAGING_PIN_PEPPER`：独立生成 32 随机字节并编码为 64 位十六进制。发布流程将其传入 Vercel runtime 的 `PIN_PEPPER`，缺失或格式错误不创建候选；不传入前端或构建环境。密钥跨部署保持一致并安全备存，不能为了发布或排错随意更换。孩子自己设置的六位 PIN 与这个服务器密钥不同。迁移和真实注册验收见 [#24](../evidence/24/README.md)。
