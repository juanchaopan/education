# #23 家长注册 KEY 管理

## 实现范围

已验证且拥有完整家长会话的家长，可在 `/family` 生成、复制、查看状态和撤销自己家庭的单次注册 KEY。新密码登录或密码重认证后的 5 分钟内允许敏感操作；旧会话的空重认证时间不会自动升级。重认证复用现有 Argon2id 与认证准入，轮换 cookie/CSRF，不延长会话绝对期限。

KEY 使用 CSPRNG 生成 16 位 Crockford Base32 字符（80 bit），分四组展示；数据库只存去掉分组符的原文的 SHA-256。只有生成响应返回原文，后续读取仅返回 ID、状态、期限与是否需要重认证。浏览器不写本地持久存储，刷新状态、页面刷新、会话切换和退出后不能从服务端取回原文；复制由用户明确触发，剪贴板由设备管理。

数据库时间确定 24 小时期限。家长、家庭、会话按固定顺序加锁，在同一事务检查权限、预占生成预算、撤销旧 KEY、创建新 KEY；部分唯一索引约束每家庭最多一个未消费且未撤销 KEY。每家庭最多生成 5 次/滚动小时、20 次/滚动 24 小时，超限不撤销原 KEY。预算记录在后续生成请求中清理超过 25 小时的数据；不是无流量也准时执行的定时删除。撤销可重复调用，不修改已消费 KEY；不同家庭和不存在 ID 均不暴露资源内容。

新增迁移 `0005_opposite_sphinx.sql` 为会话补充密码验证时间、KEY 创建/撤销时间和生成预算表。若已有重复的未使用旧 KEY，在建立唯一索引前仅保留期限较晚的一项，其余标记撤销。迁移后已有会话保留登录，生成/撤销 KEY 前需重认证。新表加入 staging RLS 和 anon/authenticated 权限撤销清单。无需新增服务凭据；Vercel Singapore 与现有 Supabase 项目配置保持现状。

## 验证

- `npm run check`：格式、lint、分层、TS7、86 项 API 单元测试、13 项 Web 测试、23 项工具链/工作流测试、应用及 Storybook 构建均通过。
- `npm run test:db`：隔离 PostgreSQL 17，49 项通过；KEY 哈希、TTL、单次原文、跨家庭拒绝、并发生成、唯一约束、撤销、消费/过期状态、重认证轮换、预算，以及密码恢复与生成竞争。
- `npm run test:e2e`：真实本地 API/数据库、桌面及手机 Chromium；生成、刷新隐藏原文、错误/正确密码重认证、重发撤销旧 KEY、撤销和退出。当前 24 项通过。
- 首轮浏览器检查 22 项通过、两个手机登录用例因共用服务器的来源限流失败。桌面/手机改用两个独立测试服务器和预算命名空间后 24 项全部通过；未放宽产品限流或断言。真实跨实例共享限流另由 PostgreSQL 和 Compose 账号测试覆盖。
- `npm run test:accounts`：便携 Docker/双实例账号、重复迁移与故障恢复，6 项通过。
- `npm run test:staging`：36 项通过；重复代码 0.56%，低于既有 2% 门槛。
- API 额外覆盖浏览器与服务端共用响应校验、非法额外身份选择字段、CSRF/Origin、no-store、错误日志及响应不含私密值。UI 覆盖只显示一次、复制、刷新、撤销及重认证入口；不自动重试敏感写入，网络结果不明确时引导刷新状态或重新生成。

## 界面证据与边界

截图使用合成账号与合成 KEY，本机 Chromium，仅作为界面审阅证据：[改动前](before.png)、[桌面生成后](after.png)、[手机](after-mobile.png)、[重认证](reauthentication.png)。Storybook 展示空、加载、处理、生成、重认证、失败和长文。已检查手机无横向溢出及控件间距。既有项目尚无固定官方 Playwright Docker 镜像的像素基准，本轮没有宣称像素回归通过。

[PR #73](https://github.com/juanchaopan/education/pull/73) 已合并，实际验收版本为 `1c1fab570c5e29cac400be37621b0e594b693202`。[PR CI](https://github.com/juanchaopan/education/actions/runs/42059550522)、[对应 main CI](https://github.com/juanchaopan/education/actions/runs/42059964561) 和 [staging 发布](https://github.com/juanchaopan/education/actions/runs/42059584565) 均通过。发布后通过 Vercel API 核对自定义域名 `education-access-spike.hyp.app` 指向 READY 部署 `dpl_CdMW66F4DAVbHmzFvUGM2HW7BddJ`，实际版本匹配且区域为 Singapore（`sin1`）；工作流事件的旧 headSha 不作为实际发布版本。

维护者已按真实浏览器步骤确认：生成 KEY 可看到四组字符并复制；刷新后原文消失，状态仍为“待使用”；重新生成后撤销，显示“已撤销”。维护者回复 “all good”，据此接受 #23 的正式 staging 界面流程。没有收集真实 KEY、密码或账号数据；精确设备、地区与延迟未提供，不据此证明大陆完整链路或普通操作 2 秒目标。

儿童兑换页面和原子消费属于 #24；本轮验证 KEY 状态与管理权限，没有声称已走通真实儿童注册。KEY 到期、撤销或更新不会删除孩子账号和进度；后续兑换必须同时检查未撤销、未消费和期限。

## 审查

按仓库 REVIEW.md 完成手工简化、代码与安全审查，关注父级/家庭/会话锁顺序、恢复竞争、CSRF、权限再检查及秘密生命周期；修复了共用测试服务器预算互相消耗、前端与服务端日期格式校验不一致、重认证错误提示被清空和手机按钮间距问题。专用 simplify/code-review/security-review 技能未安装，未声称执行这些技能或获得独立安全审查通过；以本地检查、PR CI 和维护者 diff 审阅为准。

## 回退

revert 本 PR 并按既定 staging 流程发布，保留本次增量列、预算表和索引，不对数据库执行破坏性降级。旧构建不提供 KEY 管理接口；既有家长账号和普通会话仍可使用。回退会停止本功能，不重新启用已撤销 KEY；丢失原文时只能由家长重新生成。
