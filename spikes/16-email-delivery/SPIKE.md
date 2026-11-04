# Spike #16：邮箱服务与大陆投递

- 任务：<https://github.com/juanchaopan/education/issues/16>
- 状态：维护者已回传 Gmail SMTP 连接/授权通过，并确认 **126 注册验证测试邮件进入正常收件箱，“very fast”**。记录到一封收信，尚无精确端到端延迟；**找回密码邮件与链接打开待验证，未选定正式服务，issue 保持打开**。
- 收件范围：维护者明确要求“only test 126.com”。本轮只测 126，不要求 QQ/163；其他邮箱的投递能力不由本轮证明。
- 开始：2026-11-04；基线 main `860a0b7`。分支 `spike/16-email-delivery`，探针代码不合入 main。
- 用户询问“can i use gmail”，随后选择“普通 @gmail.com 个人账号（推荐先做试点）”。据此测试个人 Gmail，不把候选选择记录为正式投递验收。

## 问题、判据与时间盒

问题：10 家庭试点能否用无额外付费的服务发送中文验证/恢复邮件，让本轮选定的 126.com 测试邮箱及时收到，并在失败时安全恢复？

最多 45 分钟主动调查/离线验证；缺少账号、授权或网络许可就记录缺口，不通过模拟邮件完成真实投递验收。真实发送安排后续一轮，且仅发送给明确同意的测试收件人。不验证正式注册、密码重置、生产 SLA、大规模群发或儿童数据处理。

通过需要同时满足：

1. 核实当前免费额度、适用用途、超额/风控行为、发信身份与域名要求，保留官方来源。无法读取的资料标为未核实。
2. 在实际 Vercel Node.js 24 部署验证 TLS、授权、冷启动和两类中文邮件发送。
3. 按维护者范围，只使用一个本人或明确同意测试的 126.com 邮箱；首轮注册验证、找回密码各一封，逐封手动触发。记录发送 UTC、SMTP 接受耗时、收件 UTC、收件箱/垃圾箱/未收到、中文/链接结果及失败。建议观察目标为两封均在 60 秒内进入正常收件箱且链接正确；这是工程观察目标，不是全大陆投递或生产 SLA 保证。QQ/163 不作为本轮验收前置条件；按结果决定是否重复取样。
4. 真实限流/授权失败或隔离故障测试证明不会无限重试、泄露凭据、误报已送达。超时不能自动认定失败并无条件重发；提交后丢失响应可能已经发出。

## 目前结论（提议）

个人 Gmail 可作为第一候选：专用 `@gmail.com` 发信账号 + 应用专用密码 + TLS SMTP。正式注册设计允许常见邮箱，探针本轮只向 126.com 测试地址发送；**不要求家长有 Google 账号，也不要求家长浏览器连接 Google**。维护者已确认一封注册验证测试邮件进入 126 正常收件箱；找回密码与重复样本未完成，QQ/163 未纳入本轮。

以账号自身 Gmail 地址作为 From，不伪装成 `@hyp.app`。此方向不需要先购买发信域名；现有网站的 CNAME、Vercel 证书和 `_vercel` 验证记录不变。后续若要自定义发信域名，需另核实域名控制权、SPF、DKIM、DMARC 和退信地址，不能把 hyp 的网站绑定能力视为已有邮件 DNS 权限。

这是**待验证的试点候选**。Gmail 没有被证明适合本产品的持续事务邮件投递；普通账号的风控、共享额度和恢复运维都可能造成中断。不要把“大概够 10 家庭”写成免费额度或投递 SLA 的证明。

## 候选与已读来源

| 候选              | 已有证据                                                                                                                                            | 未完成核实                                                  | 本轮建议                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 个人 Gmail + SMTP | Nodemailer 维护者 README 说明 Node 20+、TS 自带类型、TLS 校验和 Gmail/防火墙限制；其服务表包含 Gmail SMTP TLS 配置；本机 Node 24 / TS7 离线验证通过 | Google 当前发送额度/条款、126 实际投递、风控和恢复          | 优先做一次真实测试；无额外付费目标尚未全部核实                                   |
| Gmail API + OAuth | Google 自己的固定版本 discovery 与发送样例证明 `users.messages.send`、RFC 邮件的 base64url 编码和 OAuth 授权路径                                    | 当前 OAuth 同意/验证与刷新令牌规则、账号额度、真实发送/投递 | 应用密码不可用时评估；正式实现只申请所需最小发送权限，不能照抄样例的多项广泛权限 |
| Resend            | 官方 Node SDK README 展示 API 发信，自有域名发信先验证域名                                                                                          | 当前免费额度、测试域名收件范围、条款、超额行为和国内投递    | 备选，未选定；不能把 README 当作价格/额度证明                                    |
| Brevo             | 官方 Node SDK README 展示 transactional email API、API key、可配置请求超时/重试                                                                     | 当前免费额度、身份认证、品牌/域名要求、条款与国内投递       | 备选，未选定；事务发送不能无条件复用 SDK 默认重试策略                            |

没有依据当前官网正文核实上述免费数字，所以没有引用记忆中的每日/月度额度。第一项 GitHub 验收标准仍未完成。

来源固定提交、检索时间、SHA-256 见 [sources.json](evidence/sources.json)。Google 官方代码是接口来源；Nodemailer 是库维护者来源，不能替代 Google 最新账号政策。Resend/Brevo README 只支持表内明确的 API 声明。

## 网络与凭据限制

当前云环境允许 GitHub、npm、Vercel API；`VERCEL_TOKEN` 绑定仅适用于 `api.vercel.com`。Google 帮助页/API 文档、Resend/Brevo 价格页面的 HTTPS CONNECT 被环境代理 403 拒绝，正文未读；记录见 [blocked-sources.json](evidence/blocked-sources.json)。没有绕过代理，也没有据此认定服务在大陆或 Vercel 上不可达。

当前 TCP 授权列表为空，没有测试 SMTP 出站。现有 HTTP 密钥机制可能把代理占位符放进环境变量，它不等于可交给 SMTP 的真实密码；**不能把 Gmail 应用密码填进一个普通 HTTP 密钥入口后就声称 SMTP 已配置**。只有 Vercel API token 也不能自动读取/授权用户的 Google 账号。

实测可以在受控本机/自有服务器启动；但这不替代 Vercel 部署验证。已准备独立的 disposable Vercel 函数和管理员页面；应用密码应放到 **该项目的 Vercel 环境变量**，不放入前端、不回显。函数拒绝 production 环境，只接受部署自身 Origin 的 JSON POST 和专用请求头。收件人只从服务端 `MAIL_PROBE_126` 读取，并严格校验 `@126.com`，发送需明确 consent。它没有正式分布式限流能力，必须保留 Vercel 访问保护，仅管理员做有限次数测试。

### Vercel 预览与凭据配置

- 项目：`education-mail-spike` / `prj_dLHrRPM29UEL9MevgSCp2vMJlu5G`；独立项目，无 Git 自动部署连接。
- API 确认 Node 24、`sin1`、`target=staging`、`READY`，默认 `ssoProtection.deploymentType=all_except_custom_domains`。没有绑定自定义域名；保留 Vercel 登录保护。
- 初次无凭据预览：<https://education-mail-spike-72wpy08wj-juanchaopan1.vercel.app/>。系统环境变量自动暴露已开启；此旧部署创建时未配置凭据，不能用于验证后来新增的变量。
- 维护者报告变量配置完成后，API 元数据确认 `GMAIL_USER`、`GMAIL_APP_PASSWORD`、`MAIL_PROBE_ENABLED` 均覆盖不限定 Git 分支的 Preview；应用密码类型为 `sensitive`。未读取/解密变量内容，也未据元数据证明取值正确。
- 连接测试所用预览：<https://education-mail-spike-26ms5cd87-juanchaopan1.vercel.app/>，`dpl_BZzhQnzMGTvEB2jDF4dZw8oQkqBC`，API 确认 staging / Node24 / sin1 / READY，使用同一已验证原型代码。配置后的构建证据见 [vercel-configured-preview.json](evidence/vercel-configured-preview.json)；构建成功不等于 SMTP 授权成功。
- 当前 **126 专用预览**：<https://education-mail-spike-ebtu2urrk-juanchaopan1.vercel.app/>，`dpl_3nAiFPF3bXmnNCDNj5gQmtamQMQQ`，staging / Node24 / sin1 / READY，源码 `a905e877611ca6a0eec58b28b830fc4cc5d33873`。部署证据见 [vercel-126-preview.json](evidence/vercel-126-preview.json)，本机 126 截图见 [local-126-mobile.png](evidence/local-126-mobile.png)。尚未实际发送邮件。
- Vercel 将新项目的第一次初始化构建标为 production，虽然请求 target=staging；无凭据且代码拒绝 production 执行。已另建并确认 staging READY，删除第一次初始化构建。本轮没有发布正式产品或改动原有访问测试项目。
- API 构建证据：[vercel.json](evidence/vercel.json)。当前云环境没有预览域名访问权限，助手未直接加载线上页面或检查登录拦截；既有 SMTP 连接结果来自维护者回传，126 线上发信仍待维护者操作。API 配置、本机浏览器与用户报告分别记录。

维护者操作：

1. 用发信 Gmail 登录 <https://myaccount.google.com/security>，确认两步验证，再打开 <https://myaccount.google.com/apppasswords> 创建专用于试点的应用专用密码。不要发送普通密码或应用密码到聊天。没有该选项时先反馈，不能用普通密码代替。
2. 打开 [Vercel 该项目环境变量](https://vercel.com/juanchaopan1/education-mail-spike/settings/environment-variables)，只选 **Preview** 环境，先设置 `GMAIL_USER`（发信地址）、`GMAIL_APP_PASSWORD`（应用专用密码，去显示空格，按敏感值保存）、`MAIL_PROBE_ENABLED=yes`。这里是 Vercel 项目设置，不是 Codex HTTP 密钥。
3. Gmail 连接/授权已由维护者回传通过。请打开当前 126 预览 URL，用 Vercel 账号访问；已有部署不会自动获得新环境变量，页面只接受当前部署 URL 的 Origin，不能换成任意 alias 后假定仍可调用。
4. 维护者已报告设置 `MAIL_PROBE_126`，API 元数据确认其覆盖 Preview；未读取邮箱地址。新预览勾选同意后先点“126 · 注册验证测试”，核对收件箱与垃圾箱；收到后再测“126 · 找回密码测试”。每次手动点击发送一封，记录真实收件结果。不要关闭访问保护；预览中的 Gmail 密码永远不应出现在页面输入框。
5. 测试结束后撤销专用应用密码并停用/删除投递探针。若采用 Gmail，正式应用另外配置专用凭据，按 roadmap 重写邮件适配器，不沿用测试页面。

## 最小原型与运行

此目录单独依赖 `nodemailer@10.3.1`，不更改根工作区依赖、锁文件或正式 API。Node 24 的类型擦除运行 `.mts`；TS7 严格编译核对 SDK 类型。离线生成的邮件使用 `example.invalid` 地址；账号校验另用合成 Gmail 格式字符串，不联网验证，没有真实家长/儿童账号。

```sh
npm ci --prefix spikes/16-email-delivery --ignore-scripts
npm test --prefix spikes/16-email-delivery
npm run typecheck --prefix spikes/16-email-delivery
npm run preview --prefix spikes/16-email-delivery
```

默认 preview 只在内存生成 MIME，使用固定虚构地址，不连接网络、不读取发信密码。输出只有测试编号、用途、字节数和 `sent:false`。`--send` 只发送一封、不自动重试；发件人为个人 Gmail，TLS 465、校验服务器证书、TLS1.2+、禁用 debug、设置连接/socket 超时。这些是各阶段超时，**不是硬性的整个函数总超时保证**；Vercel 函数总时限还需实测。

用户选择该候选后，通过 Google 账号安全页面确认两步验证与“应用专用密码”可用。高级保护、组织政策等可能使该选项不可用；不要关闭保护或改用普通登录密码。使用专门测试账号，应用密码仅在秘密配置中保存；本机可复制 `.env.example` 为被忽略的 `.env.local`，填入真实值，不在 shell 命令/聊天/仓库传递密码。

仅在具备合法出站连接的受控机器，且收件人已明确同意测试时运行：

```sh
cd spikes/16-email-delivery
node --env-file=.env.local probe.mts --send
```

`MAIL_PROBE_TO` 与 `MAIL_PROBE_CONFIRM_TO` 必须相等。切换 `MAIL_PROBE_PURPOSE=reset` 单独测试第二类邮件。输出不含地址、密码、SMTP 原始响应或正文。

邮件明确标记“投递测试”，链接只是现有 `education-access-spike.hyp.app` 测试站加非敏感随机编号；**不会创建账号/完成邮箱验证/重置密码**。SMTP 接受时只记录 `smtp-accepted-inbox-unconfirmed`，需收件人另行报告真实收件时间和位置。成功输出不冒充送达。

## 结果与证据

- 初轮 11 项离线检查通过；126 修订后为 **12/12**，新增只接受 `@126.com`、拒绝其他供应商/伪装域名的检查，原有同意、Origin/请求头、HTTP 与编码检查保留。新日志见 [offline-126.tap](evidence/offline-126.tap)，初轮日志不覆盖。
- TS7 严格编译及构建通过；Node 24 默认 preview、仓库 lint 通过。
- 本机系统 Chromium 390px 移动布局通过：同意前不请求；配置未就绪可见；网络未知时提示先查邮箱且不自动重试；无横向溢出或页面脚本错误。API 为 mock，不是线上 Gmail。截图见 [local-mobile.png](evidence/local-mobile.png)。
- 测试使用 fixture 错误检查分类，不是向 Gmail 故意触发封禁/限流，也没有验证真实故障恢复。sandbox 最初阻止测试子进程，允许正常子进程执行后通过；不是邮件服务故障。
- 维护者回传 `smtp-authenticated`、`sent:false`、`smtpMs:1594`、requestId `9d0ad660-4afa-4d7c-b144-c1a011559764`，原始脱敏结果见 [gmail-connection-user-report.json](evidence/gmail-connection-user-report.json)。这是用户报告的线上 SMTP 连接/授权通过，助手没有独立重放；单个样本不是 P50/P95，1,594ms 也不是收件延迟或冷启动测量。
- 维护者回传注册验证发送结果与邮件正文：runId `19c5842c2bde2011`、SMTP 接受 1,974ms；随后确认“inbox, very fast”。记录到 **1 封进入 126 正常收件箱**，正文含可读中文；原始发送响应中的 `inboxConfirmed:false` 保留不改，另记收件人后续确认。证据见 [126-verify-user-report.json](evidence/126-verify-user-report.json)。未提供收件 UTC/精确耗时或链接点击结果，不能把 1,974ms 当作端到端延迟。
- 尚无找回密码邮件、重复投递、冷启动、配额耗尽或真实故障恢复证据；一次进入正常收件箱不代表持续投递质量。
- 详细日志见 [validation.md](evidence/validation.md)、[offline.tap](evidence/offline.tap)。

## 实测记录表

每封记录：随机 runId、verify/reset、126.com（不用完整地址）、客户端开始 UTC、Google 接受耗时、收件端显示/观察 UTC、时间精度/时钟差、正常收件箱/垃圾箱/未收到、中文与链接、错误类别、是否重发及原因。精确地址/应用密码/邮件原始头只留受控测试环境，不提交仓库；提供给维护者的头信息先脱敏。

未收到的样本也要保留，超时作为失败/观察截断；不能只对收到邮件算成功率。收件客户端可能只显示分钟，不能据此声称毫秒级端到端延迟。小样本应优先展示原始结果和样本数，不把少量样本包装成稳定的 P95。进垃圾箱或需手动标为非垃圾算首轮失败，处理后单独记录复测。

## 后续正式实现建议（未实现）

- 业务服务只生成中文邮件意图，邮件适配器负责 SMTP/API；预期验证 24h、恢复 30min 和单次令牌沿用 ADR-0009，不因更换供应商改变。
- 邮件地址只交给服务端适配器，不把 PIN/家庭 KEY/儿童名字或进度写进邮件。使用配置好的可信 HTTPS Origin 生成链接，不信任请求 Host；关闭链接跟踪、打开率追踪和第三方资源。
- 先在数据库持久化令牌/投递任务，再由可重入工作流投递。任务重试保留同一个有效令牌，不在内部每次尝试创建新令牌；用户明确重发时撤销旧令牌。队列只短暂保存发送所需秘密，受保护且发送/过期后清除，不能以“哈希存储”掩盖队列里的长期明文令牌。
- 明确“排队、服务商接受、收件确认/退信、未知”状态；SMTP 接受并不等于收件。请求超时/连接在 DATA 后断开时可能已经发送，避免盲目重试；SMTP 不承诺 exactly-once。正式策略用有界延迟/次数及可观测结果再验证。
- #21/#26 必须实现共享数据库限流、重发冷却和家长通用响应；本原型没有实现发送队列、分布式幂等/限流、退信处理或账号枚举防护。供应商额度不是产品自身的滥用防护。
- 备选服务切换前仍要验证身份、条款和目标邮箱的实际投递；Gmail 不可用不能自动变成收费发送。Google 密码修改、撤销授权或风控后需运维恢复，不要求所有家长改成 Google 登录。

## 下一轮所需输入

1. 注册验证邮件已由维护者确认进入 126 正常收件箱且很快。下一步在当前预览手动发送一次“126 · 找回密码测试”，回传脱敏结果和收件情况；不需要再配置变量或重复发送注册验证邮件。
2. 点击测试邮件内的网站链接并报告是否能打开；精确收件时间仍未知，已保留“very fast”定性观察，不编造数字。首轮两类完成后再决定是否重复样本。
3. 官网资料访问权限或用户提供当前相关政策内容，以完成免费额度/条款核实；真实故障恢复仍待验证。

在这些输入到位前不关闭 #16、不把 Q-005 标为解决，也不创建已接受 ADR。采用/放弃由用户看到证据后决定；结论获确认后只将 ADR/脱敏证据通过文档 PR 合并，原型按 spike 流程归档删除。#17 可继续使用隔离邮件适配器开发，但不能显示“邮件已投递”。
