# #25 儿童昵称与 PIN 登录和退出

## 实现范围

- `/child` 提供中文登录、加载、温和失败提示和儿童账号空状态；真实题库仍为空，不生成学习记录。`/join` 成功页可带出家庭码和昵称前往登录，不自动签发注册会话。
- 登录按去分隔符、大写家庭码及 NFKC/trim/lowercase 昵称定位。六位 ASCII PIN 使用 #24 相同的版本 1、家庭/儿童身份绑定 HMAC 与 Argon2id 32 MiB/t3/p1。未知家庭、昵称、错误 PIN、缺失/不支持的 pepper 版本统一拒绝；准入后对未知身份执行同档 dummy 验证，不宣称已证明 HTTP 时序不可枚举。
- 32 字节随机 token；数据库仅存 SHA-256，cookie 为 `__Host-education_session`、Secure/HttpOnly/SameSite=Lax/Path=/，Max-Age 180 天。有效读取同步续期数据库和 cookie，不设七天绝对退出；退出、浏览器清理或长期不活动后用原凭据恢复，不再申请 KEY。
- 家长和儿童共用浏览器 cookie。成功切换登录在同一事务撤销该 cookie 的旧角色会话，前端清理相应账号缓存；其他设备的独立会话不自动退出。儿童会话不能读取家长账号、查看或生成 KEY。
- 登录前不列出孩子或家庭资料。页面在登录成功后默认仅记住家庭码和昵称，可取消或清除；本地存储被伪造也不能授权。PIN 支持密码管理器，应用不在 localStorage/sessionStorage 保存 PIN/token，不自动重试登录写请求；失败或成功后清空 PIN。
- 迁移 `0007_military_thor_girl.sql` 添加儿童 `credential_version` 与 `child_sessions`（含期限/版本/家庭 epoch），不修改已有 PIN。Supabase staging 为新表启用 RLS 并撤销 anon/authenticated 权限。服务器沿用 `STAGING_PIN_PEPPER`，无新秘密，不做无 pepper 回退。
- 会话签发和读取按 family → child → session 顺序加锁；哈希完成后复核最新哈希、版本、家庭归属与 epoch，使用数据库当前时间检查期限。家长恢复增加 epoch 并删除该家庭儿童会话，不能让旧凭据的并发登录留下可用会话。
- 与现有认证共用进程哈希准入和 PostgreSQL advisory-lock 槽位。儿童+规范昵称 5 次/15min、20 次/日；家庭 50 次/15min、200 次/日；来源 30 次/15min、200 次/日；与家长认证共用部署 100 次/15min、500 次/日。成功也计数，429 带 Retry-After；预算 HMAC 化、25 小时清理。家庭桶用于儿童登录，对不存在的定位同样适用；家长既有邮箱预算保留，来源/部署桶两者共享，不声称已有所有认证场景的统一家庭计数。保留既有本地 2 活动/数据库 4 槽实现及故障关闭行为，没有宣称新增队列或改善实际代理来源识别。
- 准备性重构 `ec3b45b` 仅提取身份绑定 PIN 材料，原始哈希格式与参数保持不变；两项真实 Argon2 测试先固定既有行为。

## 验证记录

最终本地结果：

| 命令/范围                                                               | 结果                                                                                                        |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                         | TS7、格式、lint、分层、应用和 Storybook 构建通过；API 99、web 18、工具链 23 项测试通过                      |
| 最终会话组装整理后 `npm run lint`、`npm run typecheck`、`npm run build` | 通过；启动只计算一次共享 dummy 哈希，不重复消耗冷启动 Argon2 时间                                           |
| `npm run test:db`                                                       | 隔离 PostgreSQL 17：71 项通过，含真实锁等待后的撤销竞态、家长恢复、角色与家庭隔离、滚动/每日预算            |
| `npm run test:e2e -- --workers=2`                                       | 最终构建桌面/手机 30 项全部通过；持久 cookie、刷新、新浏览器上下文恢复、退出、定位信息不授权和 429/503 页面 |
| `npm run test:accounts`                                                 | 8 项通过；真实便携镜像 A / 部署函数处理器 B，新增儿童会话跨实例与重启、家长权限拒绝、共享 PIN 尝试额度      |
| `npm run test:staging`                                                  | 36 项通过                                                                                                   |
| `npm run db:generate`                                                   | 无 schema 漂移，无额外迁移                                                                                  |
| `npx --no-install jscpd .`                                              | 0.69%、8 处；保留既有 2% 阈值                                                                               |

本地浏览器使用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`。未修改测试超时、重试次数、检查规则或基线。

早期运行记录：新增功能数据库测试通过；一次整套运行的 70 个测试通过，但既有注册测试清理连接超时，因此该次整套运行记为失败。首次浏览器运行 28 通过、2 个既有家长手机测试超时（新浏览器窗口/截图步骤）；当时同时执行 TS7 编译等检查。随后顺序重跑，不调整产品期限、测试超时或跳过场景，最终结果单独记录。

本环境没有已安装的 simplify/code-review/security-review 专用技能；按仓库 REVIEW.md 手工做结构、权限、令牌泄漏、限流和并发审查。此记录不等于独立 AI 或安全审查通过。

## 界面证据

截图来自本地系统 Chromium 155，使用合成昵称和隔离数据库；不含真实家庭凭据。不是固定 Playwright Docker 像素基线，也不能替代大陆目标浏览器和设备验收。

- [改动前：尚无儿童登录页](before.png)
- [桌面登录](after.png) / [手机登录](after-mobile.png)
- [桌面儿童空间](space.png) / [手机儿童空间](space-mobile.png)

## 发布与真实浏览器验收

- [PR #78](https://github.com/juanchaopan/education/pull/78) 在维护者 `juanchaopan` 为最终 head `b9d427de57b7a6fc3bacd9e035db0c1f59ee7182` 添加 `human-reviewed` 后自动 squash 合并；main 提交为 `af8f7680dd736b088c0c397fcc8dd7aca4adf294`。
- [PR CI 42085263674](https://github.com/juanchaopan/education/actions/runs/42085263674)、[审核门槛 42090979010](https://github.com/juanchaopan/education/actions/runs/42090979010) 和 [精确 main CI 42091259760](https://github.com/juanchaopan/education/actions/runs/42091259760) 成功。可选 Claude/security review 为跳过，不记为独立审查通过；审查线程为空。审核前的旧 risk-gate 失败记录仍在历史中，添加标签后的新检查通过，自动合并正常完成，无需重跑旧记录。
- [首次 staging 发布 42091036886](https://github.com/juanchaopan/education/actions/runs/42091036886) 成功。该 workflow_run 的事件 head 是旧 main；实际 prepare 选择、部署和稳定域名的 provider 元数据均指向已通过 CI 的 `af8f7680dd736b088c0c397fcc8dd7aca4adf294`，不以事件 head 代替实际发布版本。
- 稳定域名为 `https://education-access-spike.hyp.app`，项目 `prj_UYpAbi3rHNsoEdnOYGWiOo8L2WP0`。首次部署 `dpl_EXgymAAb2zJ2N94C7KbBsbofpn54` 的实际别名映射、READY 状态、版本和 `regions: ["sin1"]` 已经 Vercel API 核对。
- 维护者先回复 **“all good”**，确认已有 #24 儿童使用原家庭码/昵称/PIN 登录，刷新仍显示欢迎；退出回到表单且带出家庭码/昵称、PIN 为空；原 PIN 能重新登录并保持登录。
- 在维护者保持登录后，[受控重新部署 42092715733](https://github.com/juanchaopan/education/actions/runs/42092715733) 成功。Vercel API 核对稳定域名从上述部署切换到不同的 READY 部署 `dpl_4iNUrc8gQYKtpP7mdSAanytUw2Nv`，仍为相同已批准版本及 Singapore `sin1`；沿用同一 Supabase us-east-1 数据库和已有密钥。
- 维护者随后回复 **“yes”**，确认重新部署后刷新仍显示自己的昵称和欢迎，关闭该标签再重新打开无需输入 PIN。这里验证的是关闭标签及同一版本跨部署，未将它表述为整个浏览器进程重启、不同代码版本切换或自动刷新验证。

#25 验收完成。只记录通过结果，不保存实际昵称、家庭码、PIN、KEY 或密码；未采集本次设备、浏览器版本、所在地或精确延迟，不推断大陆全网可达或两秒目标达标。角色权限、旧 token 拒绝、限流与事务竞态的细分边界以自动化证据为准，不全部记为真人复测。家长 PIN 重置由 #26 实现，保存草稿后自动刷新部署版本由 #47 实现，生产仍手动发布。

## 回退

撤回应用代码与路由，保留本次加法迁移和现有数据，不删除儿童、家庭或 PIN。不更换 `PIN_PEPPER`。需要紧急撤销儿童登录时，由受控数据库操作删除 `child_sessions` 或推进家庭 epoch；回退旧应用后原儿童端点不可用，账号/关联保留。重新上线兼容版本后使用原凭据登录；生产数据回退须按正式发布流程处理。
