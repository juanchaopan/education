# 家长验证邮件

实现/证据与边界见 [#21](../evidence/21/README.md)。应用默认关闭真实发信；当前隔离 staging 已启用并完成真实验证登录，详见验收记录。注册回执明确未发送，登录后才能主动发送验证邮件。

## 启用前

1. 核实并记录实际 Google 账号用途/资格、当前额度、超额及风控恢复、应用密码要求。2026-11-05 维护者提供了[个人 Gmail 发信限制](https://support.google.com/mail/answer/22839)和[应用密码](https://support.google.com/accounts/answer/185833)的展开正文，核对结果见 [#21 供应商说明](../evidence/21/README.md#gmail-供应商说明)。开发环境访问官方帮助页仍被代理拒绝，来源为维护者复制的正文，不声称独立抓取或获得 Google 业务批准；[Google 条款](https://policies.google.com/terms)仍适用。
2. 使用专用个人 Gmail 发件地址，启用两步验证并创建新的应用密码。权限不是只允许发送的细粒度凭据，账号发件箱及供应商留存仍受 Google 条款影响。
3. 在 GitHub Actions 配置以下值。密码和密钥仅保存在 Secrets，不进入前端、仓库、聊天或日志：

| 名称                         | 位置      | 内容                                                            |
| ---------------------------- | --------- | --------------------------------------------------------------- |
| `STAGING_GMAIL_USER`         | Variables | 完整的专用 `@gmail.com` 发件地址                                |
| `STAGING_GMAIL_APP_PASSWORD` | Secrets   | 新的 16 位应用密码，去掉显示空格                                |
| `STAGING_MAIL_PAYLOAD_KEY`   | Secrets   | 密码管理器生成的 64 位十六进制随机值（32 字节），独立于其他密钥 |

4. 供应商核实完成后，设置 Actions Variables `STAGING_MAIL_PROVIDER_APPROVED=true` 和 `STAGING_MAIL_ENABLED=true`，手动运行 main 的 staging workflow。缺配置或核实开关会拒绝候选发布；不能为了部署成功跳过校验。生产不自动启用。

发布脚本只向候选服务端环境传递必要配置；应用使用 `MAIL_ENABLED`、`MAIL_PROVIDER_APPROVED`、`GMAIL_USER`、`GMAIL_APP_PASSWORD`、`MAIL_PAYLOAD_KEY`。候选的随机 `@example.invalid` 账号冒烟不会发送邮件，因为只有真实登录后的显式请求会调用供应商。

## 验收与恢复

用维护者控制的家长邮箱在稳定 staging 注册、登录、发送、查收，并点击正式确认按钮。确认邮箱状态和重新登录权限；重复使用、重发旧链接、冷却和服务故障均有明确恢复说明。只记录合成编号、状态、耗时和收件人确认，不记录真实地址、链接令牌、邮件原文或密码。

`accepted` 不代表已送达。授权失败时恢复 Google 授权/更新应用密码后重新部署；明确暂时拒绝可在冷却后安全重试，最多三次。unknown 请先查看收件箱，没有收到时由家长明确重发，旧链接失效。没有后台隐式发送或内存队列。

每小时 `staging-mail-retention` workflow 清理过期加密载荷；查看 Actions 是否持续成功，故障恢复后可手动运行。定时工作可能延迟，不能承诺精确物理 TTL。所有权限和到期判定由数据库强制，与维护频率无关。自管服务器需以同等频率运行相同清理逻辑并监控失败。

关闭：将 `STAGING_MAIL_ENABLED=false` 后重新部署，原账号/进度不删除，页面显示尚未开放。禁用时验证 POST 也关闭。`MAIL_PAYLOAD_KEY` 跨部署保持稳定；更换会让旧的待重试载荷不可解密，现有已发链接仍按哈希有效期工作，家长可以明确重发生成新意图。不要将更换密钥作为每次部署步骤。

## 回退

可关闭发信并回退应用。迁移仅新增验证/尝试表，旧程序不使用它们；不删除父账号或回滚数据库来撤销发信。需要撤销链接时仅撤销对应验证意图，不能清空所有家庭。数据库恢复与已删除资料的处理仍由后续备份任务负责。
