# 离线与部署验证记录

- 日期：2026-11-04 UTC。
- 执行环境：Codex Linux 云环境；Node.js 24.22.1、npm 11.9.0、TypeScript 7.0.2。
- 独立依赖：nodemailer 10.3.1，自带 TypeScript 声明。
- `npm test --prefix spikes/16-email-delivery`：11/11 通过。sandbox 先拒绝子进程启动，正常子进程环境复核通过。
- `npm run typecheck --prefix spikes/16-email-delivery`：通过，严格 NodeNext / ES2023 / noEmit。
- `npm run preview --prefix spikes/16-email-delivery`：通过，`mode=offline-preview`、`sent=false`；内存 MIME 包含两种 UTF-8 正文格式。
- `npm run build --prefix spikes/16-email-delivery`：TS7 将 API 与原型核心编译成 JavaScript，已编译文件上传 Vercel，部署不借用其他 TS 编译器。
- `npm run lint`：通过。
- 本机 Chromium / 390px：同意前无请求、503 配置提示、网络错误不自动重试、无脚本错误/横向溢出。API 使用 mock，没有邮件发送。截图 `local-mobile.png`。
- Vercel API：独立项目，Node24/sin1、staging READY、默认登录保护开启、无自定义域名。部署 ID 和非秘密配置见 `vercel.json`。首次无凭据初始化被 Vercel 标为 production，现已删除；代码拒绝 production 执行。
- 维护者配置完成后，API 仅核对三个变量的名称、类型与 Preview 目标，应用密码为 Sensitive，未读取/解密取值。重新部署同一份原型，staging READY；非秘密元数据见 `vercel-configured-preview.json`。该构建快照采集时尚未运行 SMTP 连接。
- 随后维护者回传新预览连接测试：`smtp-authenticated`、`sent:false`、`smtpMs:1594`。原始脱敏结果见 `gmail-connection-user-report.json`；记录为用户报告的线上 SMTP 连接/授权通过，助手未独立重放或核对服务端日志。单样本不构成分位数，1,594ms 不是收件延迟或冷启动数字。
- 该阶段真实发送记录为 0。QQ/163 未执行且已按维护者要求排除本轮；后续 126 收信证据另列，线上访问设备/运营商/地点未提供，不能认定大陆全链路通过。

fixture 检查与 MIME 输出不证明生产邮件安全性、当前免费条款或大陆投递。源码与证据留在 disposable spike 分支，正式业务实现仍为空框架。

## 126.com 收件范围修订

维护者指定只测试 126.com，并报告已设置 `MAIL_PROBE_126`。API 仅确认变量名称、类型和 Preview 目标，未读取地址。

- `offline-126.tap`：12/12 离线检查通过，包括只接受 126 收件槽、拒绝 QQ/163 和伪装域名、保留显式同意与请求保护。
- TS7 严格编译、JavaScript 构建、仓库 lint / 格式检查通过。
- 本机 Chromium 390px 验证两枚 126 按钮、同意门槛、配置失败与网络不确定时不自动重试；API 为 mock，截图 `local-126-mobile.png`，日志 `browser-126.txt`。
- 源码提交 `a905e877611ca6a0eec58b28b830fc4cc5d33873`；构建阶段没有 126 收信样本，后续实测另列。

## 126 注册验证测试邮件

- 维护者提供发送 JSON 与对应邮件正文，并补充“inbox, very fast”。一封注册验证邮件进入正常收件箱，正文包含可读中文；脱敏记录 `126-verify-user-report.json`。
- runId `19c5842c2bde2011`，开始 `2026-11-04T22:11:41.986Z`，SMTP 接受耗时 1,974ms。原始 `inboxConfirmed:false` 是发送时状态，收件人后续确认另行保存。
- 只记录“很快”，没有精确收件时间/端到端毫秒数，没有链接打开结果；未独立重放。找回密码邮件、重复样本和真实故障恢复仍待验证。
