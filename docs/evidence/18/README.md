# #18 家长登录、会话读取与退出

本任务实现家长身份的本地应用链路；不发布网站，不修改 #14 的 Vercel 探针。相关需求 REQ-002，安全基线 ADR-0009。#17 注册依然只保存待验证账号，真实邮箱验证属于 #21。

## 行为与边界

- `POST /api/v1/parents/login`：邮箱 trim/lowercase，密码原样验证；未知邮箱准入后执行同档 Argon2id dummy verification。未知和密码错误均为相同 401 文案，不提供邮箱查询或家庭信息。不宣称已证明 HTTP 时序不可枚举。
- `GET /api/v1/session`：只从 cookie 读取自己的账号状态，不接受账号/家庭 selector。只返回角色、邮箱、真实验证标记、当前会话权限和 CSRF token。无效/过期/撤销/版本不匹配返回 401；数据库不可用返回 503，不跳过授权。
- `POST /api/v1/parents/logout`：精确 Origin、JSON、自定义请求头和会话绑定 CSRF 校验后删除数据库会话、清除 cookie。旧 cookie 随即失效；其他设备的会话不受当前设备退出影响。
- 全部私有响应及错误 `Cache-Control: no-store`。登录和退出不自动重试。页面显示加载、网络错误、错误凭据、受限/已验证状态和退出中状态；失败不丢弃输入，不显示 SQL/原始错误。
- 浏览器表单使用 `username / current-password` 自动填充；会话由 HttpOnly cookie 恢复，不把密码、令牌或 CSRF 写入 localStorage。密码管理器是否提示保存由浏览器控制，不能替用户保证。
- 页面先向服务端读取状态；登录后清除表单及 mutation 凭据，退出后清除客户端账号缓存。焦点恢复重新检查会话。真实家庭学习 API 尚未实现，不把本任务当作后续家庭权限验收。

## 会话和并发

32 随机字节的 opaque token 每次登录重新生成，数据库只存 SHA-256 哈希。cookie 为 `__Host-education_session`，Secure、HttpOnly、SameSite=Lax、Path=/，不设 Domain；开发仅本机安全上下文可用，远程必须 HTTPS，不降级 Secure。已验证家长空闲 12h、绝对 7d（cookie Max-Age 7d）；未验证家长绝对 15min（Max-Age 900），仅可查看本人验证状态和退出，没有 KEY、儿童或学习资料权限。账号/进度不会随 cookie 到期而删除。

CSRF token 用 cookie 中的高熵随机值作为 HMAC key、固定用途标签派生，仅随同源账号响应交给前端内存；不作为登录凭据，不存原始会话到数据库。服务端常量时间比较 CSRF。登录事务锁定并重新核对密码哈希、credentialVersion、家庭 authEpoch 及验证标记，防止哈希期间更改凭据仍签发旧会话。只有登录成功的事务才撤销提供的旧 cookie，并创建新会话。每次读取检查关联家庭、版本和期限；已受限会话不会因验证标记变化自动提权，需重新登录。业务验证/密码恢复仍须后续任务正确更新版本、epoch 和撤销相关数据。

数据库服务端时间更新最后活动时间，不延长绝对期限。正常重启保留数据库后有效会话仍可读取；正式滚动发布、两个进程与故障恢复由 #19/#20 验证。过期会话在下次成功登录时清理，家庭删除级联删除会话。

## 准入和资源限制

先单独提交不改变行为的 `createRegistrationAdmission` → `createAuthAdmission` 命名重构，并通过完整检查和真实数据库测试。功能提交中注册与登录注入**同一个准入实例**，共用来源、规范邮箱与全局预算；PostgreSQL 共享预算和 4 个 advisory hash slots。邮箱 10/15min、50/24h，来源 30/15min、200/24h，全局 100/15min、500/24h。会话无效读取和错误 CSRF 也消耗来源/总量预算，省略空邮箱桶；不会让全部匿名用户共享一个邮箱额度。家庭目前只有一个注册家长，邮箱上限比 ADR 的家庭总量更紧；儿童/多账号的家庭预算由后续认证任务补齐。

沿用 #17 的保守准入：每进程最多 2 个活动工作，不设等待队列；预算原子预占，哈希在事务外执行，429 带 Retry-After。独立密钥对桶键 HMAC，按服务端时间保留最多 25h、后续预占时清理。只用 socket 来源，IPv6 /64，不信任任意 X-Forwarded-For。正式受控入口地址及共享出口误伤待 #19/#20 验收。`registration_attempts` 保留现有表名；新全局 authentication 桶令部署总量计数重新起算一次，既有来源/邮箱预算继续有效。

必须使用 PostgreSQL 直连或会话级连接池。保持连接时的全局 hash slots 不等于连接丢失后的严格硬并发保证；进程/连接故障、平台硬终止和 Vercel 原生扩展/冷启动仍待 #19/#20。限流可能误伤共享出口，不能声称部署性能或三儿童并发已验收。未经验证的家长没有可用的恢复渠道前，邮件状态必须如实说明。

## 本地验证

- 新行为测试先运行，确认缺少 session 实现时失败，再实现。
- `npm run check`：TS7、格式、lint、架构、API 41 / Web 8 / 工具链与工作流 23 项、生产与 Storybook 构建。
- 隔离 PostgreSQL 17：迁移重复执行成功，16 项真实数据库测试覆盖 token 哈希、轮换、跨服务实例撤销、受限会话、空闲/绝对期限、凭据/家庭版本改变、事务签发再校验、共享预算、本人状态和 CSRF。
- 系统 Chromium 桌面及手机尺寸：12 项通过，无跳过。实际 API + PostgreSQL 测正确/错误凭据、两种账号状态、Secure/HttpOnly/SameSite、刷新、内存中 storageState 恢复到新浏览器上下文、退出和另一上下文旧 cookie 拒绝。未写出含会话的 storageState 文件。重复运行曾因旧测试共用固定限流密钥而命中 429；现每轮 Playwright 启动生成独立测试密钥隔离历史预算，产品上限保持不变。
- `npx --no-install jscpd .`：0 clones；生产依赖审计：0 reported vulnerabilities。
- 一轮本地检查曾出现 worker 超时，另一次浏览器运行记录到登录 HTTP 503；后续未放宽超时的重跑通过。该 503 的原始服务端异常未捕获，不能确定根因；隔离数据库日志未显示对应 SQL 错误。保留这一限制，功能通过不代表资源或延迟目标已验收，部署负载与诊断仍交 #19/#20。
- 本地按 REVIEW.md 做简化、代码及安全审查；无独立 simplify/code-review/security-review 技能可调用，不能声称运行了这些技能或付费 AI 审查。

本地新上下文恢复不等于实测手机关闭重开、真机密码管理器、所有国内浏览器或跨版本部署；这些仍在 #20/#23/#47/#51。邮箱验证和真实邮件、密码恢复、儿童注册、敏感操作重认证不在本任务。未部署生产，未测试大陆网络。

## 界面证据

截图使用 `example.test` 合成数据，页面状态用隔离响应夹具稳定展示；真实 HTTP/SQL 行为由上述功能测试覆盖。

- [改动前手机尺寸](family-before-mobile.png)
- [登录页手机尺寸](login-mobile.png)
- [登录错误手机尺寸](login-error-mobile.png)
- [受限账号手机尺寸](restricted-mobile.png)
- [已验证账号桌面尺寸](verified-desktop.png)

人工检查布局、中文反馈及长邮箱折行。当前没有固定官方 Playwright 镜像中已批准的像素基准；截图是验收证据，不是像素回归测试，现有 #46 的基准任务保持待完成。

## 配置与撤回

继续使用 #17 的 `REGISTRATION_ENABLED=true`、`DATABASE_URL`、稳定 `AUTH_RATE_LIMIT_KEY` 和精确 `APP_ORIGIN`，无需新增第三方凭据。旧开关名称保持以避免改变现有配置；它同时控制注册和家长会话服务。未启用时账号接口 503，不连数据库。

迁移 `0002_minor_gravity.sql` 只添加 parent_sessions、parents.credential_version 与 families.auth_epoch，不修改原有密码、注册或家庭数据。发布先受控运行迁移；关闭开关并重启可停用账号服务。代码回滚保留新增表/列；不要删除家庭或密码数据。若需强制全部家长退出，受控清空 parent_sessions（会失去登录状态，账号和进度保留）；不能仅通过回滚构建假设 cookie 已撤销。
