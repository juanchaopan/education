# #16 邮件探针证据与收尾

- 日期：2026-11-04；决定见 [ADR-0010](../0010-email-delivery-spike.md)。
- 原型：[archive/spike-16-email-delivery](https://github.com/juanchaopan/education/tree/archive/spike-16-email-delivery)，SHA `598378002feb587dcbe1f843f8c49c7041c448d4`；原型、依赖、发信接口均不合入 main。
- 维护者选择普通 Gmail，只测 126.com，报告两类邮件正常收件/很快及两个链接可打开，随后询问是否可以收尾。关闭表示本轮调查结束，不表示原始验收项全部满足。

## 实际投递记录

| 类型     | runId              | 开始 UTC                   | SMTP 耗时 | 维护者确认                                       |
| -------- | ------------------ | -------------------------- | --------- | ------------------------------------------------ |
| 注册验证 | `19c5842c2bde2011` | `2026-11-04T22:11:41.986Z` | 1,974ms   | 126 正常收件箱、很快、正文含可读中文、链接能打开 |
| 找回密码 | `3a761f89839f2bd9` | `2026-11-04T22:14:58.595Z` | 2,616ms   | 126 正常收件箱、很快、正文含可读中文、链接能打开 |

另有一次 SMTP 连接/授权通过，verify 调用 1,594ms，`sent:false`。所有线上结果均为维护者回传，未由助手独立重放；收信位置与速度由维护者确认。原始发送响应 `inboxConfirmed:false` 保留，后续收件确认另存，不篡改服务端状态。

没有收件 UTC、精确端到端延迟、地点/运营商/设备数据，不计算分位数或声称大陆全链路达标。两个链接只打开 access probe，不会验证邮箱或重置账号。没有创建正式家庭或处理儿童信息。

## 本机、构建与来源

- Node24.22.1、npm11.9.0、TS7.0.2、Nodemailer10.3.1；126 修订后 12/12 离线检查，早期 11/11 日志保留。
- 实际库生成 UTF-8 multipart 邮件；收件人/头注入、严格 126 域名、固定服务端收件槽、显式同意、Origin/JSON/请求头、已解析 body、拒绝路径和日志脱敏检查通过。fixture 错误分类不是实际故障恢复证明。
- 本机系统 Chromium 390px 确认布局、两枚 126 按钮、同意门槛、配置失败和网络不确定时不自动重试；API 为 mock。截图不是大陆线上截图。
- Vercel API 确认独立项目 Node24 / sin1 / staging READY / 默认登录保护。仅核对变量名称、类型和 Preview 目标，密码为 Sensitive，未读取邮箱或密码值。
- 固定版本 Google API/样例、Nodemailer 和 Resend/Brevo SDK 来源记录在 `sources.json`，不作为 Google 当前额度/条款证明。官方帮助/价格页面在当前环境被 CONNECT 403 拒绝，`blocked-sources.json` 如实记录；没有绕过代理。

## 原始脱敏文件

| 文件                                                                                                                                        | 内容                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [gmail-connection-user-report.json](0016-email/gmail-connection-user-report.json)                                                           | SMTP 连接/授权用户报告                                               |
| [126-verify-user-report.json](0016-email/126-verify-user-report.json) / [126-reset-user-report.json](0016-email/126-reset-user-report.json) | 两类邮件原始结果、收件和链接确认；不含完整邮箱地址                   |
| [offline-126.tap](0016-email/offline-126.tap) / [offline.tap](0016-email/offline.tap)                                                       | 新旧离线检查原始日志                                                 |
| [browser-126.txt](0016-email/browser-126.txt) / [local-126-mobile.png](0016-email/local-126-mobile.png)                                     | 本机浏览器结果与 126 页面截图                                        |
| [local-mobile.png](0016-email/local-mobile.png)                                                                                             | 早期 QQ/163 原型本机截图，非实际投递证据；随后按维护者要求缩小为 126 |
| [vercel-126-preview.json](0016-email/vercel-126-preview.json)                                                                               | 实际投递所用部署的非秘密构建元数据                                   |
| [vercel-configured-preview.json](0016-email/vercel-configured-preview.json) / [vercel.json](0016-email/vercel.json)                         | 早期部署/变量元数据快照，字段是当时状态                              |
| [sources.json](0016-email/sources.json) / [blocked-sources.json](0016-email/blocked-sources.json)                                           | 官方代码来源和受阻页面                                               |
| [validation.md](0016-email/validation.md)                                                                                                   | 分阶段验证记录，历史步骤不冒充当前状态                               |

## 尚未验证与交接

免费额度/当前用途条款/超额行为由 #20 核实；正式验证和恢复的队列/限流/重试、授权撤销、4xx/5xx、超时未知送达由 #21/#22 验收；真实大陆完整链路由 #51 验收，#52 以这些完成为生产上线门槛。没有将缺口勾成通过，#16 原始验收项保留未完成说明。

退役记录另存 `0016-email/retirement.json`；Google 应用密码仍须维护者撤销。测试网站链接指向另一个 #14 访问探针，其生命周期不属于本轮邮件探针的退役范围。
