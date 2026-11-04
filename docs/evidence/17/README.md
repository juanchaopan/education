# #17 家长待验证注册：实现与本地验收

范围：REQ-002；中文家长表单、共享契约、异步 Argon2id、家庭与待验证家长原子创建、隔离邮件适配器。合并状态以 GitHub PR 为准；本记录不是生产或大陆网络验收。

## 行为与边界

- `POST /api/v1/parents/register` 仅接受配置的精确 Origin、JSON 和 `X-Education-Request: registration`；限制请求体，不隐式转换类型或丢弃额外字段。私有响应 `no-store`，不设置登录 cookie，不返回账号/家庭标识。
- 邮箱 trim/lowercase 后校验，不进行 Gmail 点号/加号别名折叠；当前支持常见 ASCII 邮箱域名及本地部分，不支持 SMTPUTF8/带引号本地部分。密码不 trim/截断，15–128 Unicode 码点（最多 512 UTF-8 字节）、本地常见密码拒绝清单、允许空格和密码管理器；Argon2id m=32768 KiB/t=3/p=1、随机盐。
- 新邮箱与重复邮箱返回完全相同的 202 receipt 和界面。两者都经过同档哈希；重复请求不覆盖密码。家庭插入与家长插入同事务，邮箱唯一冲突回滚临时家庭；数据库失败不返回成功。不据此宣称已证明 HTTP 时序不可枚举。
- 注册不授予权限。`email_verified=false`，不创建 KEY，不签发会话；KEY 接口尚未实现。邮件适配器固定为隔离实现，不连接 Gmail、不创建令牌、不发信。界面明确尚未发送邮件；#21 实现持久投递意图、令牌及重发，#22 实现恢复。
- 浏览器提交禁用重复点击，无自动 POST 重试；10s 中断后说明结果未知，保留内存输入，允许手动重试。成功后清除页面密码。无 localStorage/日志凭据，不宣称浏览器已记住登录。

## 注册资源准入

PostgreSQL 使用服务端时间与事务锁原子预占邮箱 10/15min、50/24h；来源 30/15min、200/24h；注册总量 100/15min、500/24h。所有预算在哈希前预占，新邮箱和重复邮箱一致。HMAC 桶键不保存原邮箱/IP，IPv6 按 /64 聚合；只使用 socket 来源，不信任客户端转发头。预算记录保留最多 25h，在下一次准入事务中清理，不宣称已有独立定时清理服务。

本步骤对注册采用更保守的立即 429：每实例最多 2 个正在准入/处理的请求，不启动 ADR-0009 提议的 4 位等待队列。连接超时 1s、SQL statement timeout 3s；哈希不放在数据库事务中。4 个 PostgreSQL 会话 advisory slot 在健康连接下限制跨实例工作；专用连接关闭释放锁，避免用 Promise 超时回收仍运行的原生哈希。必须使用直连或会话级连接，不能使用事务级池。

**这不证明数据库连接中断而原生任务仍运行时的严格全局上限。** 实际平台的故障回收、硬终止与资源测量由 #20/#19 继续验收；不自动降低哈希成本。#18 等后续认证任务须统一登录/注册预算和入口代理信任配置，不能把本步骤的注册预算当作已实现全站认证限流。发布仍须通过这些后续门槛。

注册默认关闭；启用要求已迁移隔离数据库、跨实例一致的独立随机 `AUTH_RATE_LIMIT_KEY` 和精确 `APP_ORIGIN`。生产启用时要求 HTTPS。部署与 Compose 接线在 #19/#20；本 PR 不部署或修改云环境。

## 验证

环境：Node.js 24.22.1、npm 11.9.0、TypeScript 7.0.2、隔离 PostgreSQL 17 容器、系统 Chromium。测试账号均为 `example.test` 合成夹具，没有真实家庭信息。

执行命令（数据库变量指向隔离实例，密钥未记录）：

```sh
npm run check
npm run db:migrate
npm run db:migrate
npm run test:db
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
npx --no-install jscpd .
npm audit --omit=dev
git diff --check
```

结果：`npm run check` 通过（API 29 项、Web 5 项、工具链/工作流 23 项，TS7、lint、架构、构建与 Storybook）；迁移连续两次成功；8 项真实数据库测试通过；桌面与移动尺寸共 8 项浏览器测试通过、无跳过；重复代码 0 块；生产依赖审计 0 已报告漏洞；diff 检查通过。浏览器注册测试连接真实本地 API 与数据库；503 界面测试使用网络拦截。生产镜像构建通过，非 root（uid 1000）环境的原生 Argon2 哈希与校验通过，不代表 Vercel 原生打包已通过。

截图仅用于本次人工评审，不是固定官方 Playwright 镜像中建立的像素回归基准；正式基准仍待 #20/#51 工具环境验收。系统 Chromium 的手机尺寸不能代替真实手机、中文浏览器或大陆访问测试。

| 画面                       | 文件                                       |
| -------------------------- | ------------------------------------------ |
| 修改前家长空间（手机尺寸） | [before](family-before.png)                |
| 注册表单（手机尺寸）       | [after](family-after-mobile.png)           |
| 注册表单（桌面）           | [desktop](family-after-desktop.png)        |
| 待验证结果                 | [receipt](registration-receipt-mobile.png) |
| 失败后保留输入             | [error](registration-error-mobile.png)     |

简化、代码与安全复查按 `REVIEW.md` 手动进行；本环境没有独立的 simplify/code-review/security-review 技能，不报告为已运行这些技能或付费 AI 审查。中高风险合并仍由维护者确认。

## 撤回与后续

设 `REGISTRATION_ENABLED=false` 并重启可关闭注册，不删除账号。可 revert 应用提交；迁移只新增 `registration_attempts` 表和索引，旧应用可与它共存，回滚不需要删表。需彻底移除时先停止注册、备份并经受控迁移处理；不删除家庭/家长数据来回滚。下一任务为 #18，正式邮件验证与真实部署仍分别为 #21/#20。
