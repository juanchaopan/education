# #15 账号安全探针证据

- 日期：2026-11-04；问题与范围见 [ADR-0009](../0009-account-security-spike.md)。
- 原型：[archive/spike-15-account-security](https://github.com/juanchaopan/education/tree/archive/spike-15-account-security)，原型/内存规则模型不合并 main。
- 结束依据：维护者选择六位 PIN，澄清儿童保持登录与部署刷新，随后要求结束探针、commit/push/PR。这是设计基线的结束授权，不是生产验收或每个默认值均由维护者逐项指定。

## 本机环境和方法

Node 24.22.1、Linux x86-64、Xeon Platinum 8370C，5 可见 CPU、cgroup 配额 4 CPU / 32 GiB；不是 Vercel Hobby 函数资源。`argon2@0.45.2` 异步原生实现，p=1、盐 16 字节、输出 32 字节。每组新子进程，6 次预热，每操作 30 样本，P50/P95 用 nearest-rank，排队计入响应时间；RSS 是进程高水位，含预热/分配器，不含宿主或其他服务。无数据库、HTTP、网络或冷启动耗时。

第一轮 3 档参数 × 串行/3 同时执行/3 请求但最多 2 执行槽 = 9 组；确认轮对 19/32 MiB 串行/两槽各重复两轮 = 8 组。共 **1,020 次正式操作**，原始样本和所有超标完整保留。

| m / t / p      | 串行 hash P95（ms，全部轮次范围） | 3 请求/2 槽 hash P95（ms）   | 3 请求/2 槽 verify P95（ms） | 限制与判断                                                  |
| -------------- | --------------------------------- | ---------------------------- | ---------------------------- | ----------------------------------------------------------- |
| 19 MiB / 2 / 1 | 62.27–316.00                      | 110.02、101.85、109.11       | 133.68、95.39、110.19        | 本机符合探针阈值；低资源备选，不自动切换                    |
| 32 MiB / 3 / 1 | 142.60–271.08                     | **1,163.69**、254.10、246.77 | 542.28、264.55、304.91       | 初轮排队 hash 不满足 <1s；采用为 staging 起点，实际资源复测 |
| 64 MiB / 3 / 1 | 523.97                            | 1,331.32                     | 1,333.68                     | 本次不推荐，单次/排队超标                                   |

32 MiB 两槽峰值 RSS 97.52–97.75 MiB，64 MiB 三同时执行峰值 225.65 MiB。19 MiB 组 RSS 约 109 MiB，高于部分 32 MiB 组；不能据此推定内存线性或部署预算，目标必须测量整体进程。

## 验证范围

19 个通过场景包含：同名跨家庭定位、未知身份错误形状、规范化唯一、账号/日限流窗口、家长近期重认证及重置/退出撤销、儿童持久会话跨越 7 天/一年并续期、180 天不活动精确边界、KEY 单次/重发/过期、昵称冲突不消费、PIN 基本规则、Origin 精确匹配、随机 token 字节数。大部分是**顺序内存规则模型**，不是 HTTP 或数据库事务测试。

实际运行了 Argon2id 的正确/错误 PIN、错误家庭/pepper 和随机盐检查；本机 20 个同时哈希请求使用 **19 MiB/t2** 通过一个进程准入器，6 个完成、14 个拒绝、峰值执行 2。没有验证跨实例租约、队列超时、数据库崩溃、真实网络时序或全部重置竞态。

独立 `HashOptions` 调用用仓库 **TypeScript 7.0.2** 严格 NodeNext 编译通过，没有变更正式 workspace 依赖。探针 lint、格式、重复代码及差异检查通过。哈希测量发生在会话修订前，会话修订只重跑场景，没有重跑或篡改成本数字。

浏览器关闭重开、自动刷新、版本切换、cookie/缓存头、草稿保护、真实邮件、Vercel 打包/性能、大陆用户和正式 PostgreSQL 均未由本探针验证。没有建立真实家长/儿童账号或新增部署。

## 原始证据

| 文件                                                                       | 内容                                       |
| -------------------------------------------------------------------------- | ------------------------------------------ |
| [argon2.json](0015-account-security/argon2.json)                           | 第一轮 9 组全部样本、分位数、RSS 与环境    |
| [argon2-confirmation.json](0015-account-security/argon2-confirmation.json) | 确认轮 8 组全部样本和环境                  |
| [scenarios.tap](0015-account-security/scenarios.tap)                       | 修订后 19/19 场景结果与耗时                |
| [validation.md](0015-account-security/validation.md)                       | 原型实际执行命令、TS7、lint/格式与验证边界 |
| [sources.json](0015-account-security/sources.json)                         | 读取时间、SHA-256、字节数及来源 URL        |

原型重现：从归档标签取出代码，在 `spikes/account-security` 执行 `npm ci`、`npm run bench`、`node bench.mjs --confirm`、`npm run check`；TS7 命令见验证记录，需要先按仓库说明安装根依赖。原始性能依赖当时资源，不保证再次运行相同数字。

## 官方来源与适用边界

四份 OWASP 文档固定于提交 `e43c9badc9bc6a9f79ec00cb5997991ffe97be80`，具体 URL/读取时间/校验值见来源 JSON。Password Storage 支持 Argon2id、目标硬件测量、pepper 与随机盐；Authentication 支持避免枚举、账号限流及锁定拒绝服务权衡；Session Management 支持服务端撤销、安全 cookie 和期限；CSRF Prevention 支持来源与 token 校验。

Node 24 crypto API 文档与 `argon2` npm 元数据用于运行时/包候选核查；本次实测用 `argon2@0.45.2`，不声称测过 Node 原生实现。OWASP 不规定本产品 24h KEY、180 天儿童会话、六位 PIN 或各次数上限；这些是可复测的工程默认值，不能把引用当作此产品已通过安全认证。
