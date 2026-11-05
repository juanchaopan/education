# 路线图任务规格

以下为维护者确认的 39 个任务规格。每项已关联 GitHub issue、里程碑、类型与大小标签；执行进度和后续讨论以链接的 GitHub issue 为准。

<a id="issue-14"></a>

## [#14](https://github.com/juanchaopan/education/issues/14) 验证免费托管与大陆访问退路

### 类型

探针（`type:spike`）；里程碑 M0。

### 目标

比较免费应用、PostgreSQL、TLS、休眠、持久化、隔离 staging 与预览能力；确定有证据支持的候选或自有服务器所需资料。

### 对应需求

REQ-007、REQ-009；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 候选平台，When 调研并做可用的连通性验证，Then ADR 记录日期、官方来源、额度、持久化和成本边界，明确实测与待测。
- [ ] Given 免费候选不满足大陆访问，Then 列出自有服务器/域名资料与待验证项，不宣称已部署。

### 涉及的组件

- `docs/adr`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `infra`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

—

### 大小和风险

- 大小：S。
- 预估风险：低；计划交付为文档与验证结论；可执行原型若提交仓库需重新评估风险。

### 测试要点

区分云端出站与大陆端到端证据；无凭据或设备时记录阻塞，不推定成功。

<a id="issue-15"></a>

## [#15](https://github.com/juanchaopan/education/issues/15) 确定账号安全参数与儿童登录方式

### 类型

探针（`type:spike`）；里程碑 M0。

### 目标

通过限时设计验证确定 KEY 有效期、PIN、家庭定位、会话、重认证与限流规则。

### 对应需求

REQ-002；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 昵称可跨家庭重复，Then 登录设计先定位家庭，家庭码不提供访问权限。
- [ ] Given 目标试点资源，When 验证 Argon2id 成本与并发，Then ADR 给出有依据的哈希参数、令牌期限及限流策略；无目标资源时明确复测要求。

### 涉及的组件

- `docs/adr/0004-api-data-details.md`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

—

### 大小和风险

- 大小：S。
- 预估风险：低；计划交付为文档与验证结论；可执行原型若提交仓库需重新评估风险。

### 测试要点

账号枚举、家庭串用、低熵 PIN、哈希资源耗尽；未确认的体验参数列为提议。

<a id="issue-16"></a>

## [#16](https://github.com/juanchaopan/education/issues/16) 验证邮箱服务与大陆投递

### 类型

探针（`type:spike`）；里程碑 M0。

### 目标

选择可用于验证和恢复邮件的适配器及真实投递验证方案。

### 对应需求

REQ-002、REQ-007；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 候选服务，Then 核实免费额度、发信域名要求和当前条款并记录来源。
- [ ] Given 已配置测试发信账号，When 向选定大陆邮箱发测试邮件，Then 记录送达、延迟和失败恢复；缺少配置时标记未完成。

### 涉及的组件

- `docs/adr`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

—

### 大小和风险

- 大小：S。
- 预估风险：低；计划交付为文档与验证结论；可执行原型若提交仓库需重新评估风险。

### 测试要点

重发限流、链接域名、延迟和垃圾邮件；不使用真实儿童信息。

### 探针收尾（有条件采用）

维护者指定只测 126，注册验证/找回密码两封均确认正常收件、很快、网站链接可打开，接受 Gmail 作为试点实现方向。结论与证据见 [ADR-0010](adr/0010-email-delivery-spike.md)。原始验收项包含尚未验证内容，保留未勾：当前条款/额度由 #20 核实，正式限流/失败恢复由 #21/#22 验收，实际大陆全链路和生产门槛由 #51/#52 承接。关闭 #16 表示调查结束，不能报告原验收全通过。

<a id="issue-17"></a>

## [#17](https://github.com/juanchaopan/education/issues/17) 家长提交注册并持久化待验证账号

### 类型

功能（`type:feature`）；里程碑 M0。

### 目标

实现中文注册表单、密码哈希、家庭与待验证家长的原子创建，使用隔离邮件适配器测试。

### 对应需求

REQ-002；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 新家长邮箱与合规密码，When 注册，Then 创建一次待验证账号，页面准确提示下一步。
- [ ] Given 重复提交、重复邮箱或数据库失败，Then 不产生重复家庭、不泄露邮箱存在性，不显示虚假成功；待验证账号不能生成 KEY。

### 涉及的组件

- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/identity`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/database`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#15](https://github.com/juanchaopan/education/issues/15)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

真实 PostgreSQL 原子性、错误文案、输入校验；无真实邮件时不声称已发送。

<a id="issue-18"></a>

## [#18](https://github.com/juanchaopan/education/issues/18) 家长登录、读取会话与退出

### 类型

功能（`type:feature`）；里程碑 M0。

### 目标

家长可登录查看本人账号状态并退出；未验证账号仅进入受限验证流程。

### 对应需求

REQ-002；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 正确凭据，When 登录，Then 服务端设置安全 cookie，会话令牌仅哈希存储，页面显示真实账号状态。
- [ ] Given 错误凭据、失效会话、跨站写请求或退出后的旧 cookie，Then 拒绝权限且执行限流；响应不暴露邮箱存在性。

### 涉及的组件

- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/identity`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/database`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#17](https://github.com/juanchaopan/education/issues/17)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

Secure/HttpOnly/SameSite、来源校验、会话固定、撤销、跨家庭访问。

<a id="issue-19"></a>

## [#19](https://github.com/juanchaopan/education/issues/19) 用多实例 Compose 验证账号贯通

### 类型

工程（`type:chore`）；里程碑 M0。

### 目标

同一隔离数据库运行两个应用实例，验证注册到登录、刷新与退出的最薄链路。

### 对应需求

REQ-002、REQ-007；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 两个应用实例，When 注册后经另一实例登录和读取状态，Then 数据与会话一致。
- [ ] Given 数据库中断或迁移失败，Then 就绪检查失败且页面明确未保存；迁移由单独受控步骤执行。

### 涉及的组件

- `infra`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `e2e`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `.github/workflows`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#18](https://github.com/juanchaopan/education/issues/18)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

真实 DB、重复迁移、跨实例限流与撤销、CI 账号流程；不公开诊断写入端点。

<a id="issue-20"></a>

## [#20](https://github.com/juanchaopan/education/issues/20) 接入隔离 staging 与条件式 PR 预览

### 类型

工程（`type:chore`）；里程碑 M0。

### 目标

将已通过 CI 的提交部署至选定测试环境，提供可核对提交的测试地址。

### 对应需求

REQ-007、REQ-009；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 平台与凭据已就绪，When main 通过检查，Then 自动部署隔离 staging 并运行账号薄链路冒烟。
- [ ] Given 平台支持 PR 预览，Then 使用独立数据并在关闭后清理；不支持时记录限制并使用 staging，生产仍手动发布。

### 涉及的组件

- `infra`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `.github/workflows`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `docs`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#14](https://github.com/juanchaopan/education/issues/14)、[#19](https://github.com/juanchaopan/education/issues/19)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

无生产密钥/家庭数据进入预览；TLS、重启持久化、提交标识、失败部署保持上个可用版本。

### #16 邮件探针交接（上线前，未验收）

- [ ] 正式家庭 staging 启用 Gmail 发信前，核实当前 Google 账号用途/资格、发送额度、超额与风控恢复、应用密码要求及 Vercel 出站；保留官方来源/日期。#16 受网络限制未读取当前条款，不能凭两封收信填写数字或承诺持续免费。
- [ ] 继续隔离服务端凭据和收件数据；正式应用重新配置凭据，不使用已退役的管理员发信页面。未通过上述门槛时使用隔离邮件适配器，不假装邮件已送达。

决定与证据：[ADR-0010](https://github.com/juanchaopan/education/blob/main/docs/adr/0010-email-delivery-spike.md)。#16 的调查结束不代表此项通过。

<a id="issue-21"></a>

## [#21](https://github.com/juanchaopan/education/issues/21) 邮箱验证与限流重发

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

让家长通过真实邮件完成验证后获得家庭管理权限。

### 对应需求

REQ-002；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 待验证账号，When 消费有效单次验证链接，Then 原子标记已验证并开放相应权限。
- [ ] Given 过期/重复链接、投递失败或频繁重发，Then 明确恢复路径且不授予未验证权限。

### 涉及的组件

- `apps/api/identity`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#16](https://github.com/juanchaopan/education/issues/16)、[#18](https://github.com/juanchaopan/education/issues/18)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

令牌哈希、过期与并发消费、日志脱敏、真实投递集成与模拟失败。

### #16 邮件探针交接（未实现/未验收）

- [ ] Gmail 适配器使用 TLS 和有界执行；持久化发信意图，跨实例共享重发限流/冷却；重试保留同一有效令牌，用户明确重发才撤销旧令牌。
- [ ] 验收授权撤销、配额/4xx/5xx、连接失败、超时及 DATA 后未知送达；不盲目重发，不将 SMTP 接受显示为邮箱已验证，故障后有明确恢复路径。
- [ ] 用正式 24h 单次验证令牌完成账号验证；#16 只证明两封测试邮件进入 126 正常收件箱及网站链接可打开，不会开放账号权限。

决定与限制：[ADR-0010](https://github.com/juanchaopan/education/blob/main/docs/adr/0010-email-delivery-spike.md)。Google 当前条款/额度由 #20 核实，生产由 #52 把关。

<a id="issue-22"></a>

## [#22](https://github.com/juanchaopan/education/issues/22) 家长密码恢复与旧会话撤销

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

家长可通过邮箱恢复访问。

### 对应需求

REQ-002；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 家长请求恢复，Then 返回通用响应并限流发送单次链接。
- [ ] Given 有效链接，When 设置新密码，Then 撤销旧会话；过期/已用链接不改变账号。

### 涉及的组件

- `apps/api/identity`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#21](https://github.com/juanchaopan/education/issues/21)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

并发重置、账号枚举、邮件失败、旧会话与旧令牌失效。

### #16 邮件探针交接（未实现/未验收）

- [ ] 正式恢复使用 30min 单次链接、通用申请响应和共享限流；验证过期/重复/并发、重发与旧会话撤销。
- [ ] 复用受控邮件适配器并实测授权/配额/连接/超时、未知送达和有界恢复；投递重试不持续更换令牌，日志/队列不长期保存明文密码或令牌。
- [ ] 用实际账号完成恢复闭环；#16 找回密码邮件的链接只打开 access probe，不是密码恢复功能验收。

决定与证据：[ADR-0010](https://github.com/juanchaopan/education/blob/main/docs/adr/0010-email-delivery-spike.md)。邮件恢复任务是本 issue；#26 是家长重置儿童访问。

<a id="issue-23"></a>

## [#23](https://github.com/juanchaopan/education/issues/23) 家长生成和撤销单次注册 KEY

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

已验证家长可给孩子生成 KEY 并查看有效状态、撤销未使用 KEY。

### 对应需求

REQ-002；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 已验证家长，When 生成 KEY，Then 绑定当前家庭，存储哈希并仅本次显示原文。
- [ ] Given KEY 已撤销/过期或其他家庭请求管理，Then 不可兑换或读取。

### 涉及的组件

- `apps/api/identity`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#21](https://github.com/juanchaopan/education/issues/21)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

随机性、TTL 边界、只显示一次、身份/家庭授权、日志无 KEY。

<a id="issue-24"></a>

## [#24](https://github.com/juanchaopan/education/issues/24) 儿童用 KEY 自助注册

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

儿童输入 KEY、昵称与 PIN 后加入正确家庭。

### 对应需求

REQ-002；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 有效 KEY，When 完成注册，Then 同一事务消费 KEY 并创建儿童。
- [ ] Given 并发兑换或网络重试，Then 最多创建一名儿童，返回已完成或可恢复状态；无效 KEY 提供中文恢复说明。

### 涉及的组件

- `apps/api/identity`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#23](https://github.com/juanchaopan/education/issues/23)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

真实 DB 并发、幂等请求、同家庭重名、跨家庭同名、回滚与 PIN 哈希。

<a id="issue-25"></a>

## [#25](https://github.com/juanchaopan/education/issues/25) 儿童昵称与 PIN 登录和退出

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

儿童在家庭定位上下文内登录，并只看到自己的空间。

### 对应需求

REQ-002；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 正确家庭上下文与昵称/PIN，Then 获取儿童会话，不能使用家长权限。
- [ ] Given 错误 PIN、伪造家庭或达到限流，Then 拒绝登录；家庭码和记住设备本身不授权。

### 涉及的组件

- `apps/api/identity`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#24](https://github.com/juanchaopan/education/issues/24)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

跨实例限流、家庭隔离、枚举、防爆破、退出及会话过期。

<a id="issue-26"></a>

## [#26](https://github.com/juanchaopan/education/issues/26) 家长重置儿童访问

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

家长经近期身份验证后为关联孩子重置访问。

### 对应需求

REQ-002、REQ-005；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 家长完成近期重认证，When 重置自己孩子 PIN，Then 更新凭据并撤销全部旧儿童会话。
- [ ] Given 其他家庭儿童、失效重认证或重复请求，Then 不越权、不重复改变已完成结果。

### 涉及的组件

- `apps/api/identity`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#25](https://github.com/juanchaopan/education/issues/25)、[#22](https://github.com/juanchaopan/education/issues/22)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

真实 DB 撤销跨实例生效、旧 PIN/旧 cookie 失效、错误文案与家庭授权。

<a id="issue-27"></a>

## [#27](https://github.com/juanchaopan/education/issues/27) 验证 AI 服务资格、费用与后端调用

### 类型

探针（`type:spike`）；里程碑 M1。

### 目标

评估免费/付费推理与图像服务；OpenAI 只有部署和目标用户都符合条件时才能选用。

### 对应需求

REQ-003、REQ-006、REQ-008；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 候选服务，Then 记录当前条款、支持地区、儿童输入政策、保留、价格、配额及必要家长披露。
- [ ] Given 合格候选和授权测试密钥，When 后端调用，Then 测量有效响应起点和用量；不合格或无法验证时记录替代项与阻塞，不以代理绕过限制。

### 涉及的组件

- `docs/adr`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#14](https://github.com/juanchaopan/education/issues/14)

### 大小和风险

- 大小：S。
- 预估风险：低；计划交付为文档与验证结论；可执行原型若提交仓库需重新评估风险。

### 测试要点

无儿童真实数据的合成请求；费用测算、取消语义、token 上限、免费额度耗尽。

<a id="issue-28"></a>

## [#28](https://github.com/juanchaopan/education/issues/28) 验证中文语音与触摸浏览器兼容性

### 类型

探针（`type:spike`）；里程碑 M1。

### 目标

分别验证手机、平板和桌面的录音、中文识别、朗读及触摸绘图方案。

### 对应需求

REQ-003、REQ-007；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 设备矩阵，When 测试权限、录音格式、中文识别/朗读与触摸，Then 记录具体系统/浏览器版本、能力与延迟。
- [ ] Given 浏览器内建能力不可用，Then 评估合格免费或服务端替代方案并保留文字入口；未测试设备明确标记。

### 涉及的组件

- `docs/adr`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

—

### 大小和风险

- 大小：S。
- 预估风险：低；计划交付为文档与验证结论；可执行原型若提交仓库需重新评估风险。

### 测试要点

真实设备证据、麦克风拒绝、后台切换、不同音频格式；不假定 Web Speech 普遍可用。

<a id="issue-29"></a>

## [#29](https://github.com/juanchaopan/education/issues/29) 验证作答一致性与删除恢复方案

### 类型

探针（`type:spike`）；里程碑 M1。

### 目标

在隔离原型中验证幂等、草稿冲突和删除清单恢复；明确备份期限与删除时限提议。

### 对应需求

REQ-005、REQ-006、REQ-008、REQ-009；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 并发提交和超时重试，Then 原型证明单次作答不会重复累计，草稿版本冲突可识别。
- [ ] Given 含已删除家庭的旧备份，Then 恢复演练设计要求先应用删除清单再开放登录；ADR 列出保留期限、RPO/RTO 和待确认参数。

### 涉及的组件

- `docs/adr/0005-data-consistency.md`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#14](https://github.com/juanchaopan/education/issues/14)

### 大小和风险

- 大小：S。
- 预估风险：低；计划交付为文档与验证结论；可执行原型若提交仓库需重新评估风险。

### 测试要点

不产出正式业务代码；记录并发失败判据和恢复证据，不将提议标为用户已确认。

<a id="issue-30"></a>

## [#30](https://github.com/juanchaopan/education/issues/30) 版本化题目插件与四级题库导航

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

扩展现有空清单，提供年级/学科/分类/顺序、题目版本与专属页面接入契约。

### 对应需求

REQ-001、REQ-009；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 隔离题目夹具，When 导航，Then 四级结构稳定排序、题目版本可追踪且可自由复习。
- [ ] Given 正式空清单、未知题目或版本，Then 展示中文空状态/不可用说明；服务端判定规则不进入浏览器产物。

### 涉及的组件

- `libs/problems`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/library`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/catalog`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#25](https://github.com/juanchaopan/education/issues/25)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

不同学科夹具、版本变更、相同顺序稳定排序、构建产物无测试题与私有判定。

<a id="issue-31"></a>

## [#31](https://github.com/juanchaopan/education/issues/31) 逐步教学、重复指令与提示阶梯

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

提供每次一个目标、重听/重试、小提示到示范的通用教学页面。

### 对应需求

REQ-004、REQ-006；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 题目教学定义，When 请求提示或重试，Then 显示具体下一步并记录帮助事件，不责备、不惩罚重试。
- [ ] Given 无法确定的输入，Then 请求确认；规则不能判断时不标知识错误，不伪造掌握。

### 涉及的组件

- `apps/web/features/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/problems`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#30](https://github.com/juanchaopan/education/issues/30)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

夹具覆盖连续重试、重复指令、步骤切换、提示事件和键盘操作。

<a id="issue-32"></a>

## [#32](https://github.com/juanchaopan/education/issues/32) 触摸绘图与位置反馈组件

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

提供触摸/鼠标绘图、撤销清空与针对步骤或区域的反馈标记。

### 对应需求

REQ-003、REQ-004；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 支持设备，When 画图和撤销，Then 笔画坐标在缩放/旋转后保持一致。
- [ ] Given 反馈标记越界或识别不确定，Then 拒绝无效标记并请儿童确认；不逐笔发送远端请求。

### 涉及的组件

- `apps/web/features/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#31](https://github.com/juanchaopan/education/issues/31)、[#28](https://github.com/juanchaopan/education/issues/28)

### 大小和风险

- 大小：M。
- 预估风险：中；涉及用户交互或端到端行为，最终依实际修改路径判定。

### 测试要点

真实触摸、指针取消、高 DPI、颜色之外的提示、导出尺寸/大小限制。

<a id="issue-33"></a>

## [#33](https://github.com/juanchaopan/education/issues/33) 保存恢复七天草稿与显式冲突处理

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

恢复最近成功保存的步骤与临时绘图，断网或冲突时明确状态。

### 对应需求

REQ-005、REQ-006、REQ-009；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 草稿最后编辑未满七天，When 返回，Then 恢复版本与位置；并发编辑返回冲突供选择，不静默覆盖。
- [ ] Given 已过期、明确放弃或已提交，Then 读取不可恢复且清理存储；失败保存显示未同步，原始音频从不存储。

### 涉及的组件

- `apps/api/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/database`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#32](https://github.com/juanchaopan/education/issues/32)、[#29](https://github.com/juanchaopan/education/issues/29)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

真实 DB 版本竞争、到期读取与清理任务、断网重试、跨家庭隔离。

<a id="issue-34"></a>

## [#34](https://github.com/juanchaopan/education/issues/34) 提交作答并区分独立与提示后完成

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

持久化可信作答与帮助事件，维护每儿童每题版本的进度摘要。

### 对应需求

REQ-004、REQ-005、REQ-006；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 作答使用过提示，When 提交，Then 记录提示后完成，不能计为独立成功。
- [ ] Given 重复提交或 AI 迟到，Then 仅累计一次并清除对应草稿；无法确定不算知识错误，AI 文本不能直接写掌握。

### 涉及的组件

- `apps/api/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/database`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#33](https://github.com/juanchaopan/education/issues/33)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

并发幂等、提交与草稿清理同事务、题目版本、提示事件不可由客户端抹除。

<a id="issue-35"></a>

## [#35](https://github.com/juanchaopan/education/issues/35) 家长查看真实学习摘要与复习建议

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

显示每个孩子的进度、独立成功、提示使用、反复困难及有依据的复习建议。

### 对应需求

REQ-005；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 已有作答，When 家长选择自己孩子，Then 显示可追溯的摘要与区分独立/提示完成的统计。
- [ ] Given 无记录或证据不足，Then 显示空状态/不足以判断，不把次数当掌握；其他家庭数据拒绝访问。

### 涉及的组件

- `apps/api/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#34](https://github.com/juanchaopan/education/issues/34)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

统计口径、题目版本、重复事件、不确定识别排除、空状态。

<a id="issue-36"></a>

## [#36](https://github.com/juanchaopan/education/issues/36) 家长安排练习与儿童自由复习

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

家长给关联儿童选题，儿童可查看安排并自由重做已学题。

### 对应需求

REQ-005、REQ-009；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 已发布题目，When 家长安排练习，Then 仅目标家庭与儿童可见，重复请求不重复创建。
- [ ] Given 空题库或题目版本不可用，Then 清楚提示；安排不锁住其他题目或强制顺序。

### 涉及的组件

- `apps/api/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/database`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#30](https://github.com/juanchaopan/education/issues/30)、[#26](https://github.com/juanchaopan/education/issues/26)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

家长/儿童权限、跨家庭攻击、重复安排、下架题目、自由复习。

<a id="issue-37"></a>

## [#37](https://github.com/juanchaopan/education/issues/37) 家长管理外部 AI 处理授权

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

按服务与用途披露儿童输入处理和保留政策，支持授权与撤回。

### 对应需求

REQ-003、REQ-008、REQ-009；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 家长未授权，Then 服务端拒绝向供应商发送儿童输入。
- [ ] Given 家长授权或撤回，Then 保存政策版本与状态，后续请求立即遵守；明确应用不保存不等于供应商零保留。

### 涉及的组件

- `apps/api/identity`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/database`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#26](https://github.com/juanchaopan/education/issues/26)、[#27](https://github.com/juanchaopan/education/issues/27)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

家庭隔离、撤回竞态、最少授权记录、政策版本变化与重认证。

<a id="issue-38"></a>

## [#38](https://github.com/juanchaopan/education/issues/38) 受控 AI 网关与引导模式切换

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

接入已验证供应商并保持默认付费开关开启；缺钥、无资格或无授权时给出真实可用状态。

### 对应需求

REQ-006、REQ-008；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 可调用服务，Then 仅后端持钥，使用最小题目上下文与输出上限，AI 请求不占用数据库事务。
- [ ] Given 十秒未有有效响应、失败或取消，Then 保留作答并提供引导选项，切换后迟到响应不覆盖新操作。

### 涉及的组件

- `apps/api/ai`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#27](https://github.com/juanchaopan/education/issues/27)、[#37](https://github.com/juanchaopan/education/issues/37)、[#31](https://github.com/juanchaopan/education/issues/31)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

流式有效响应计时、故障/取消/无钥、日志无密钥或原文；仅隔离测试调用，真实儿童入口待 [#39](https://github.com/juanchaopan/education/issues/39)/[#40](https://github.com/juanchaopan/education/issues/40)。

<a id="issue-39"></a>

## [#39](https://github.com/juanchaopan/education/issues/39) AI 用量账本与可配置费用上限

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

限制请求频率与上下文，记录实际用量，支持之后配置金额上限。

### 对应需求

REQ-008；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 配置费用上限，When 多实例并发调用，Then 事务预留和结算防止超额，未知计费保守处理且不中断引导。
- [ ] Given 未配置预算，Then 明确显示未设置且保持付费默认开启；不自动推定无限授权、不无限重试，记录脱敏 token/模型用量。

### 涉及的组件

- `apps/api/ai`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/database`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#38](https://github.com/juanchaopan/education/issues/38)、[#29](https://github.com/juanchaopan/education/issues/29)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

并发预留、取消仍可能收费、失败释放/未知结果、幂等结算；实际额度上线前确认。

<a id="issue-40"></a>

## [#40](https://github.com/juanchaopan/education/issues/40) 开放文字与绘图的结构化教学反馈

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

儿童主动提交必要文字或绘图，得到结合当前步骤的中文反馈与有效区域标记。

### 对应需求

REQ-003、REQ-004、REQ-006、REQ-008；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 有授权的按需提交，Then 优先规则检查，需要模型时只发送受限上下文与可读压缩图像。
- [ ] Given 输出不合法、坐标越界、低置信或提示注入，Then 安全拒绝或请求确认，不执行 HTML/工具、不让模型修改权限/进度。

### 涉及的组件

- `apps/api/ai`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#39](https://github.com/juanchaopan/education/issues/39)、[#32](https://github.com/juanchaopan/education/issues/32)、[#34](https://github.com/juanchaopan/education/issues/34)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

内容长度与媒体大小、反馈 schema、重复请求、低置信、引导回退；不跨家庭缓存儿童输入。

<a id="issue-41"></a>

## [#41](https://github.com/juanchaopan/education/issues/41) 中文语音输入与识别确认

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

通过已验证适配器按需录音和识别，让儿童确认识别内容后提交。

### 对应需求

REQ-003、REQ-006、REQ-008；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 授权且设备支持，When 儿童开始/停止录音，Then 有清晰状态，识别结合当前步骤且可纠正。
- [ ] Given 拒绝麦克风、识别不确定或断连，Then 使用文字/题目交互且不记知识错误；不永久保存原始音频。

### 涉及的组件

- `apps/web/features/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/ai`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#28](https://github.com/juanchaopan/education/issues/28)、[#40](https://github.com/juanchaopan/education/issues/40)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

真实设备格式、停止/取消/后台切换、上传限制、授权撤回、音频临时数据清理。

<a id="issue-42"></a>

## [#42](https://github.com/juanchaopan/education/issues/42) 中文朗读与重复播放指令

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

儿童可重复听当前简短指令、暂停或停止，始终可阅读文字。

### 对应需求

REQ-003、REQ-004；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 当前步骤有已试听通过、适合儿童的普通话音频，When 点重听，Then 播放当前步骤且不会叠音。自然的 AI 声音可在试听通过后使用，见 [ADR-0012](adr/0012-browser-voice-touch-spike.md)。
- [ ] Given 缺少语音或步骤切换，Then 显示文字并停止过期播放；若方案使用外部服务须遵守 [#37](https://github.com/juanchaopan/education/issues/37)/[#39](https://github.com/juanchaopan/education/issues/39) 的授权与用量控制。

### 涉及的组件

- `apps/web/features/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#28](https://github.com/juanchaopan/education/issues/28)、[#31](https://github.com/juanchaopan/education/issues/31)

### 大小和风险

- 大小：M。
- 预估风险：中；涉及用户交互或端到端行为，最终依实际修改路径判定。

### 测试要点

真机声音可用性、重复点击、播放中切页、无自动持续监听。

<a id="issue-43"></a>

## [#43](https://github.com/juanchaopan/education/issues/43) 家长导出本家庭数据

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

经近期重认证导出家庭学习摘要、练习及必要账户数据。

### 对应需求

REQ-005、REQ-009；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 家长通过重认证，When 导出，Then 仅包含该家庭的数据并说明格式/范围。
- [ ] Given 导出期间会话撤销或家庭删除，Then 不再提供数据；导出不包含密码/PIN 哈希、KEY、会话密钥或原始音频。

### 涉及的组件

- `apps/api/identity`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#35](https://github.com/juanchaopan/education/issues/35)、[#36](https://github.com/juanchaopan/education/issues/36)、[#37](https://github.com/juanchaopan/education/issues/37)、[#29](https://github.com/juanchaopan/education/issues/29)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

权限隔离、字段白名单、过期草稿排除、空家庭、下载缓存和错误清理。

<a id="issue-44"></a>

## [#44](https://github.com/juanchaopan/education/issues/44) 家庭删除与即时访问撤销

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

家长确认删除后撤销家庭访问并清除在线数据，明确备份与供应商范围。

### 对应需求

REQ-002、REQ-005、REQ-009；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 家长重认证并确认删除，Then 立即撤销会话与待执行调用，按已定方案删除家庭数据并记录最小删除清单。
- [ ] Given 并发写入、重复删除或部分失败，Then 不恢复可访问数据，提供准确处理状态，临时绘图和导出一并清理。

### 涉及的组件

- `apps/api/identity`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/ai`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/family`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `libs/contracts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#43](https://github.com/juanchaopan/education/issues/43)、[#33](https://github.com/juanchaopan/education/issues/33)、[#39](https://github.com/juanchaopan/education/issues/39)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

跨实例撤销、写入与删除竞争、清理幂等、日志无原始输入；完成时限按 [#29](https://github.com/juanchaopan/education/issues/29) 明确。

<a id="issue-45"></a>

## [#45](https://github.com/juanchaopan/education/issues/45) 备份恢复并防止已删除家庭复活

### 类型

工程（`type:chore`）；里程碑 M1。

### 目标

配置独立备份、淘汰期限与恢复流程，实际演练后记录 RPO/RTO。

### 对应需求

REQ-007、REQ-009；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 测试环境备份，When 恢复，Then 验证数据完整性并在开放服务前应用删除清单。
- [ ] Given 旧备份包含已删除家庭或过期草稿，Then 仍不能登录或读取；失败恢复保持服务关闭。

### 涉及的组件

- `infra`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `scripts`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `docs`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#44](https://github.com/juanchaopan/education/issues/44)、[#20](https://github.com/juanchaopan/education/issues/20)、[#29](https://github.com/juanchaopan/education/issues/29)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

隔离恢复演练、备份加密/权限、期限清理、删除清单保留与销毁，不恢复生产数据至预览。

<a id="issue-46"></a>

## [#46](https://github.com/juanchaopan/education/issues/46) 固定视觉基准与儿童可访问性检查

### 类型

工程（`type:chore`）；里程碑 M1。

### 目标

在固定浏览器和中文字体环境建立经人工评审的桌面/移动截图基准。

### 对应需求

REQ-003、REQ-004、REQ-007；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 关键页面和组件状态，Then 覆盖正常、空、加载、失败、长文本与重复指令。
- [ ] Given 键盘、减少动画、触摸与缩放，Then 控件可操作、焦点清晰、对比度足够且反馈不只靠颜色。

### 涉及的组件

- `apps/web`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `e2e`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `.github/workflows`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#26](https://github.com/juanchaopan/education/issues/26)、[#31](https://github.com/juanchaopan/education/issues/31)、[#32](https://github.com/juanchaopan/education/issues/32)、[#35](https://github.com/juanchaopan/education/issues/35)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

固定镜像截图、真机触摸补充；基准变化须维护者审查，不自动接受新快照。

<a id="issue-47"></a>

## [#47](https://github.com/juanchaopan/education/issues/47) 验收可用的空题库家庭框架

### 类型

工程（`type:chore`）；里程碑 M1。

### 目标

验证空框架交付点：账号、关联、恢复、隔离、家长空面板和数据控制。

### 对应需求

REQ-001、REQ-002、REQ-005、REQ-008、REQ-009；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 正式题库为空，When 走通家庭流程，Then 无演示题、无伪造进度，家长可管理孩子及导出删除。
- [ ] Given 无 AI 密钥，Then 默认付费配置仍开启但不能发起调用，页面准确说明；真实教学能力仍待题目验收。

### 涉及的组件

- `e2e`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `docs`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#20](https://github.com/juanchaopan/education/issues/20)、[#22](https://github.com/juanchaopan/education/issues/22)、[#26](https://github.com/juanchaopan/education/issues/26)、[#37](https://github.com/juanchaopan/education/issues/37)、[#44](https://github.com/juanchaopan/education/issues/44)、[#46](https://github.com/juanchaopan/education/issues/46)

### 大小和风险

- 大小：M。
- 预估风险：中；涉及用户交互或端到端行为，最终依实际修改路径判定。

### 测试要点

至少两个家庭的端到端越权/重置/删除、重新登录、生产构建不含测试夹具。

<a id="issue-48"></a>

## [#48](https://github.com/juanchaopan/education/issues/48) 为首批真实题目设计教学与理解验证

### 类型

探针（`type:spike`）；里程碑 M1。

### 目标

收到用户题目后，为每题确定步骤、常见错误、提示阶梯、绘图区域和相似题迁移验证。

### 对应需求

REQ-001、REQ-003、REQ-004、REQ-005；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 用户提供的题目，Then 产出可评审教学计划，明确规则能判断与需要模型的部分。
- [ ] Given 缺少相似题或有效评估证据，Then 不宣称掌握；每题内容与计划由用户确认后实施。

### 涉及的组件

- `docs/design`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `docs/adr`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#31](https://github.com/juanchaopan/education/issues/31)；外部依赖：用户提供题目。

### 大小和风险

- 大小：S。
- 预估风险：低；计划交付为文档与验证结论；可执行原型若提交仓库需重新评估风险。

### 测试要点

题目未提供时为明确外部阻塞；评审重复讲解的耐心、下一步具体性与独立成功定义。

<a id="issue-49"></a>

## [#49](https://github.com/juanchaopan/education/issues/49) 接入第一道真实题目的专属页面

### 类型

功能（`type:feature`）；里程碑 M1。

### 目标

按批准教学计划实现一题的专属交互、服务端规则与共享进度/降级集成。

### 对应需求

REQ-001、REQ-003、REQ-004、REQ-005、REQ-006、REQ-009；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 已批准真实题目，When 学习或复习，Then 正确分类排序、专属反馈、保存恢复和家长进度可用。
- [ ] Given AI 失败或反复遇错，Then 仍可使用该题提示和规则；识别不确定不算错、提示后完成不算独立完成。

### 涉及的组件

- `libs/problems`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/web/features/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `apps/api/learning`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#48](https://github.com/juanchaopan/education/issues/48)、[#30](https://github.com/juanchaopan/education/issues/30)、[#34](https://github.com/juanchaopan/education/issues/34)、[#36](https://github.com/juanchaopan/education/issues/36)、[#40](https://github.com/juanchaopan/education/issues/40)、[#41](https://github.com/juanchaopan/education/issues/41)、[#42](https://github.com/juanchaopan/education/issues/42)

### 大小和风险

- 大小：M。
- 预估风险：中；涉及用户交互或端到端行为，最终依实际修改路径判定。

### 测试要点

真实题目的正确/常见错误/不确定输入与无 AI 路径；后续每题各建 issue/PR，超过 M 则先拆交互。

<a id="issue-50"></a>

## [#50](https://github.com/juanchaopan/education/issues/50) 接入脱敏运行指标与故障告警

### 类型

工程（`type:chore`）；里程碑 M1。

### 目标

记录请求 ID、延迟、错误分类、数据库失败与 AI 用量，并配置选定告警渠道。

### 对应需求

REQ-006、REQ-007、REQ-008；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 正常或失败请求，Then 可观测有效响应时间、失败率和用量，不记录儿童输入、原始媒体、KEY、PIN 或密钥。
- [ ] Given 数据库/供应商故障，Then 验证告警与就绪状态，儿童页面保持真实的保存/引导状态。

### 涉及的组件

- `apps/api`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `infra`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `docs`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#20](https://github.com/juanchaopan/education/issues/20)、[#39](https://github.com/juanchaopan/education/issues/39)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

日志脱敏测试、告警演练、健康指标、无配置告警不能宣称已接入。

<a id="issue-51"></a>

## [#51](https://github.com/juanchaopan/education/issues/51) 验证大陆完整学习链路与三儿童并发

### 类型

工程（`type:chore`）；里程碑 M1。

### 目标

在真实大陆手机/平板/桌面检验页面、账号、邮件、数据、语音/AI 与降级。

### 对应需求

REQ-003、REQ-004、REQ-005、REQ-006、REQ-007、REQ-008；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 选定平台和真实题目，When 三儿童同时学习，Then 记录环境、样本、统计口径及普通操作 2 秒/AI 有效响应 5 秒的达标情况，十秒提供引导。
- [ ] Given 依赖不可达或不合资格，Then 不判发布通过，验证替代平台；记录儿童理解评审结果及证据限制。

### 涉及的组件

- `docs`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `e2e`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#47](https://github.com/juanchaopan/education/issues/47)、[#49](https://github.com/juanchaopan/education/issues/49)、[#45](https://github.com/juanchaopan/education/issues/45)、[#50](https://github.com/juanchaopan/education/issues/50)

### 大小和风险

- 大小：M。
- 预估风险：中；涉及用户交互或端到端行为，最终依实际修改路径判定。

### 测试要点

全链路而非首页；触摸/麦克风、断网重试、取消、配额耗尽、跨家庭隔离与进度恢复。

### #16 邮件探针交接（完整链路仍待验收）

- [ ] 在实际大陆设备完成正式注册验证/恢复邮件链路，记录设备、地区/运营商、成功/失败与有意义的端到端延迟；普通操作目标仍按产品要求测量。
- [ ] #16 只测试维护者指定的 126：两类邮件正常收件、很快、网站链接可打开；没有收件 UTC 或用户设备/地点，不能当作本 issue 的量化/跨运营商证据。不要求重复验证 QQ/163 来关闭 #16。

来源：[ADR-0010](https://github.com/juanchaopan/education/blob/main/docs/adr/0010-email-delivery-spike.md)。

<a id="issue-52"></a>

## [#52](https://github.com/juanchaopan/education/issues/52) 手动生产发布与回滚演练

### 类型

工程（`type:chore`）；里程碑 M1。

### 目标

准备可审核的生产发布步骤、迁移、健康检查和回退，并由维护者显式执行发布。

### 对应需求

REQ-007、REQ-009；见 [产品需求](product/requirements.md)、[架构总览](architecture/overview.md) 及相关 ADR。

### 验收标准

- [ ] Given 大陆访问/资格/恢复验收通过且生产资料齐备，Then 手动发布精确提交镜像，迁移有备份并向后兼容。
- [ ] Given 发布健康检查失败，Then 可回退上一应用/配置，不能用应用回退掩盖破坏性数据库迁移。

### 涉及的组件

- `infra`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `.github/workflows`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。
- `docs`：实现/验证本任务目标；目录名是规划边界，遵守现有模块规范。

### 依赖

[#51](https://github.com/juanchaopan/education/issues/51)

### 大小和风险

- 大小：M。
- 预估风险：高；涉及身份、数据、共享协议、AI、基础设施或审查流程等高风险路径。

### 测试要点

先在隔离环境演练；生产必须显式授权，域名/TLS/监控/备份全部实际验证。

### #16 邮件上线门槛（未验收）

- [ ] #20 已核实实际 Gmail 账号的当前用途/资格、额度、超额/风控行为和服务端凭据配置，具有官方来源及日期；未完成则不批准正式生产账号邮件上线。
- [ ] #21/#22 的正式验证/恢复、共享限流、有界重试、未知送达/授权撤销恢复和会话撤销通过，#51 的实际大陆完整邮件链路完成。
- [ ] 测试探针已退役、专用应用密码已由维护者撤销；正式环境另配凭据，仍按本 issue 手动发布。

#16 仅结束调查并有条件采用 Gmail 试点方向，不是生产发布授权。见 [ADR-0010](https://github.com/juanchaopan/education/blob/main/docs/adr/0010-email-delivery-spike.md)。
