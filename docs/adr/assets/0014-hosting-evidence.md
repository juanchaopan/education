# #14 托管探针证据与复测方案

日期：2026-11-04。关联 [ADR-0008 提议](../0008-hosting-spike.md)；探针分支 `spike/14-hosting-mainland`。本记录区分读取到的供应商声明、仓库静态检查、网络观测与尚未执行的计划。

## 已执行检查

| 检查                   | 结果                                                                                                                                     | 能证明什么 / 不能证明什么                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 管理环境状态与网络策略 | 连接正常、策略 enforced、观测 current；没有配置托管凭据、运行变量或 VPN                                                                  | 可使用既有 GitHub 身份读取资料；没有可用的托管部署身份或大陆测量节点                                                 |
| 官方文档仓库读取       | 从 GitHub API 成功读取 23 份版本化文件，其中 22 份纳入下方依据；HTTP 操作成功                                                            | 证明读到了指定提交的官方文档内容；不等于供应商网站已发布完全相同版本或账号具备该资格                                 |
| Render 官网请求        | `curl -I --max-time 20 https://render.com/docs/free`：退出 56，代理 CONNECT 返回 403；响应 Date 为 `Wed, 04 Nov 2026 19:34:51 GMT`       | 证明当前工具环境的访问被拒；没有收到 Render 套餐正文，也不能据此判断大陆访问                                         |
| 代码静态检查           | 基线 `41a99d4`；`infra/Dockerfile` 使用 Node 24，`apps/api/src/index.ts` 同源提供静态文件；Compose 中 PG 17 有命名卷且端口只绑定回环地址 | 容器方向可移植；没有平台部署验证。现有 `/health/live` 不检查 DB，Compose 应用未连接真实账号流程，也没有生产 TLS 配置 |
| 实际托管与大陆设备     | 未执行；无目标账号/服务器和大陆设备                                                                                                      | 不生成延迟、成功率或并发能力数字，不推定免费额度足够                                                                 |

所有网络访问沿用环境代理和 TLS 校验。读取供应商维护的公开 GitHub 文档本身不测试其运行端点。没有注册账号、创建资源、修改 DNS、购买套餐或发送真实家庭数据。

## 官方来源快照

下列链接固定到读取时的 Git 提交。原始正文 SHA-256 与完整路径见 [来源清单](0014-hosting-sources.json)，便于复核文档更新。价格、免费资格与控制台能力在真正开户时必须再次检查。

| 编号 | 固定版本的官方维护文档                                                                                                                                                                          |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1   | [railwayapp/docs：试用、验证限制与卷保留](https://github.com/railwayapp/docs/blob/dcbeb29573190a245d9af7cc43fbbdde0dee7375/content/docs/pricing/free-trial.md)                                  |
| R2   | [railwayapp/docs：套餐、资源上限、计费](https://github.com/railwayapp/docs/blob/dcbeb29573190a245d9af7cc43fbbdde0dee7375/content/docs/pricing/plans.md)                                         |
| R3   | [railwayapp/docs：资源单价](https://github.com/railwayapp/docs/blob/dcbeb29573190a245d9af7cc43fbbdde0dee7375/content/docs/pricing.md)                                                           |
| R4   | [railwayapp/docs：持久卷](https://github.com/railwayapp/docs/blob/dcbeb29573190a245d9af7cc43fbbdde0dee7375/content/docs/volumes.md)                                                             |
| R5   | [railwayapp/docs：新加坡区域](https://github.com/railwayapp/docs/blob/dcbeb29573190a245d9af7cc43fbbdde0dee7375/content/docs/deployments/regions.md)                                             |
| R6   | [railwayapp/docs：预览环境和变量复制](https://github.com/railwayapp/docs/blob/dcbeb29573190a245d9af7cc43fbbdde0dee7375/content/guides/preview-deployments-with-pr-environments.md)              |
| R7   | [railwayapp/docs：环境隔离](https://github.com/railwayapp/docs/blob/dcbeb29573190a245d9af7cc43fbbdde0dee7375/content/docs/environments.md)                                                      |
| R8   | [railwayapp/docs：休眠与唤醒限制](https://github.com/railwayapp/docs/blob/dcbeb29573190a245d9af7cc43fbbdde0dee7375/content/docs/deployments/serverless.md)                                      |
| R9   | [railwayapp/docs：HTTPS 与域名](https://github.com/railwayapp/docs/blob/dcbeb29573190a245d9af7cc43fbbdde0dee7375/content/docs/networking/public-networking.md)                                  |
| R10  | [railwayapp/docs：硬额度停止工作负载](https://github.com/railwayapp/docs/blob/dcbeb29573190a245d9af7cc43fbbdde0dee7375/content/docs/pricing/cost-control.md)                                    |
| N1   | [neondatabase/website：配额和恢复文档冲突](https://github.com/neondatabase/website/blob/8ef23d99f5d19d7d778bc1ed8744dc163dc0898a/content/docs/introduction/plans.md)                            |
| N2   | [neondatabase/website：计算休眠](https://github.com/neondatabase/website/blob/8ef23d99f5d19d7d778bc1ed8744dc163dc0898a/content/docs/introduction/scale-to-zero.md)                              |
| N3   | [neondatabase/website：数据库区域](https://github.com/neondatabase/website/blob/8ef23d99f5d19d7d778bc1ed8744dc163dc0898a/content/docs/introduction/regions.md)                                  |
| N4   | [neondatabase/website：无业务数据的分支](https://github.com/neondatabase/website/blob/8ef23d99f5d19d7d778bc1ed8744dc163dc0898a/content/docs/guides/branching-schema-only.md)                    |
| N5   | [neondatabase/website：免费资格、配额耗尽行为](https://github.com/neondatabase/website/blob/8ef23d99f5d19d7d778bc1ed8744dc163dc0898a/public/pricing.md)                                         |
| C1   | [cloudflare/cloudflare-docs：China Network 套餐](https://github.com/cloudflare/cloudflare-docs/blob/e44be6d39fb2b9b40ab90392895c6ab70d56e1ce/src/content/docs/china-network/index.mdx)          |
| C2   | [cloudflare/cloudflare-docs：接入资格](https://github.com/cloudflare/cloudflare-docs/blob/e44be6d39fb2b9b40ab90392895c6ab70d56e1ce/src/content/docs/china-network/get-started.mdx)              |
| C3   | [cloudflare/cloudflare-docs：Workers 免费限制](https://github.com/cloudflare/cloudflare-docs/blob/e44be6d39fb2b9b40ab90392895c6ab70d56e1ce/src/content/docs/workers/platform/limits.mdx)        |
| C4   | [cloudflare/cloudflare-docs：Workers 计费](https://github.com/cloudflare/cloudflare-docs/blob/e44be6d39fb2b9b40ab90392895c6ab70d56e1ce/src/content/docs/workers/platform/pricing.mdx)           |
| C5   | [cloudflare/cloudflare-docs：Pages 与预览额度](https://github.com/cloudflare/cloudflare-docs/blob/e44be6d39fb2b9b40ab90392895c6ab70d56e1ce/src/content/docs/pages/platform/limits.mdx)          |
| C6   | [cloudflare/cloudflare-docs：Containers 无免费档](https://github.com/cloudflare/cloudflare-docs/blob/e44be6d39fb2b9b40ab90392895c6ab70d56e1ce/src/content/docs/containers/platform/pricing.mdx) |
| C7   | [cloudflare/cloudflare-docs：域名证书](https://github.com/cloudflare/cloudflare-docs/blob/e44be6d39fb2b9b40ab90392895c6ab70d56e1ce/src/content/docs/pages/configuration/custom-domains.mdx)     |

可直接复核供应商原文：将清单中的 repository、path 和 revision 代入 `gh api repos/OWNER/REPO/contents/PATH?ref=REVISION`；响应的 content 字段按 Base64 解码后计算 SHA-256。不要把供应商示例命令或默认生产变量直接用于本项目。

## 关键边界和证据冲突

- **免费不是常驻资源包**：R1/R2 的 Free $1/月是消费额度，0.5 GB RAM 是每服务最大资源配置；R3 的 $10/GB/月是内存使用费。ADR 中的 $1.25 算式仅假设常驻平均 0.125 GB，不是应用测量。
- **休眠不等于删除**：N2 的 Neon 休眠保留数据；N5 记录 CU-hours/出站耗尽暂停、容量超额阻止写入；R1 则明确试用卷在额度过期 30 天后删除。三种状态不能混为一谈。
- **免费恢复能力尚不确定**：N1 表格写 “Instant restore: Not available”，同一文件正文 “Instant restore” 段落写 “Free: No charge, up to 6 hours”。N5 表格也将 Instant restore 留空但列出 6 小时 history window。本轮不据此承诺免费 PITR；需实际账号验证或供应商澄清，并保留独立备份方案。
- **预览可能继承生产秘密**：R6 描述默认从 production 基础环境复制服务、网络和变量；N4 的普通分支可能复制数据，schema-only 可避免复制业务行。应使用隔离 staging 作为预览来源或从空库迁移，独立凭据与合成数据。只切换 URL 不能证明隔离。
- **区域与地区资格分开**：R5/N3 有新加坡区域，C1/C2 的中国网络套餐是 Enterprise 附加订阅。这些事实都不能代替大陆设备测试，也不能证明 #27 中的 AI 地区资格。

## 下一轮最小验证计划（尚未执行）

先选择一个候选、确认账号免费资格与上限，或获取 ADR 中的服务器资料；只运行隔离 staging。到达费用/时间边界就停止，由维护者决定后续，不自动升级。临时探针代码放 `spikes/` 并随探针分支归档，不进入正式应用。

1. **部署与 TLS**：用固定提交构建现有容器，配置域名、证书及 HTTPS 重定向；检查 HTML、JS/CSS 和 `/api/catalog`，验证不依赖额外外部前端 CDN。记录托管区域、实例资源、镜像摘要、套餐、DNS、证书过期日，且不在证据中暴露凭据。
2. **DB 与持久化**：用专用测试库做合成数据事务写入/读取；应用重启、重新部署、数据库计算休眠/唤醒后核对数据。检查 PostgreSQL 17 兼容性、证书验证、连接池、迁移和服务端到 DB 的延迟。`/health/live` 成功不能代替这个检查。做一份导出并在隔离库恢复；生产备份/删除语义继续由 #29/#45 完成。
3. **环境隔离**：staging 和生产候选使用不同数据库、账号、卷、密钥及部署目标；预览仅继承测试基础环境。验证 staging 身份无法读生产库，关闭预览后只删除预览资源。暂不放真实家庭资料，不给预览生产 AI 密钥。
4. **大陆访问初测**：从真实大陆设备使用日常网络、不经 VPN 测候选域名。至少记录手机和桌面、Wi-Fi 和移动网络、两个运营商；省份和浏览器版本即可，无需个人 IP。相同设备分两个时段测试。该样本是首轮筛选，不能保证所有省份/运营商可达。
5. **测量口径提议**：每个设备/网络/时段组合先预热 5 次，再测 30 次普通读取，另测 10 次确认休眠后的首请求；分别记录成功数/总数、状态码、P50、P95、最大值，不把错误和超时从分母隐藏。设备端计时覆盖点击到有效页面/结果显示；普通操作的健康态 P95 暂以 2 秒为筛选目标，冷启动另列且超标须明确报告。超时按 30 秒记录为失败；小样本 P95 只作初筛，不据此承诺 SLA。
6. **并发与完整链路**：#19/#20 有账号流程后，用 3 个隔离的合成儿童会话测注册/登录/保存；功能未实现时标为未测，不用健康接口替代。#16 验证大陆邮箱投递，#27 确认供应商资格及后端调用；#51 在真实题目可用后测绘图、语音、家长授权和进度完整链路，健康 AI 5 秒开始有效响应、10 秒提供引导模式。记录首次有效内容，而非仅连接或首字节。
7. **成本和退出**：记录至少一个代表性使用时段的应用/DB 用量及持久存储变化，明确月度外推假设和 staging 成本。核实到顶后的状态提示与数据可导出性，清理合成数据和临时资源，避免试用过期误删唯一数据副本。迁移退路为同一容器和 PostgreSQL 导出/恢复，不复制供应商专有认证数据。

## 测量记录模板

尚无实测值。下一轮按每组填写；空白不可解释为通过。

| 日期/区域/套餐 | 设备/浏览器/网络 | 提交与目标 | 路径/冷或热 | 成功/总数 | P50/P95/最大值(ms) | 错误与超时 | 用量与结论 |
| -------------- | ---------------- | ---------- | ----------- | --------- | ------------------ | ---------- | ---------- |
| 待测           | 待测             | 待测       | 待测        | 未测      | 未测               | 未测       | 未测       |

## 本轮结论

官方文档足够支持候选筛选；部署和大陆性能判据尚未满足。建议优先补齐自有服务器资料，保留 Railway + Neon 为可选的短期免费额度实验。#14 的 ADR 待维护者选择后另开正式文档 PR；Q-006 不标记为全部解决，#20/#51 的外部验证仍有待完成。
