# #14 托管探针结项证据

日期：2026-11-04。关联 [ADR-0008](../0008-hosting-spike.md)；代码及原始研究说明保存在 [archive/spike-14-hosting-mainland](https://github.com/juanchaopan/education/tree/archive/spike-14-hosting-mainland)。

## 用户验收

维护者在使用自定义域名测试后回复：“test successful. let's wrap up spike 14 commit push and pr”。据此接受 Vercel Hobby + 自定义域名作为后续 staging 集成方向并结束 #14。

此为用户报告的成功结果，未附测试 JSON、地区、运营商、设备或时延数据。因此不推算 P50/P95、冷启动时间或线上成功率，不认定所有大陆网络可达，也不把本地 20/20 结果转记为线上结果。正式跨网络和完整产品验收仍属 #51。

## 执行证据

| 层次             | 结果                                                                                                         | 证据边界                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 官方资料         | 读取 23 份官方 GitHub 文档，其中 22 份列入下方来源清单                                                       | 指定 Git 提交的供应商声明；不是实际账号/部署能力验证                                                          |
| Vercel 账号      | API 身份校验成功；工作区 juanchaopan1，套餐 hobby                                                            | 没有升级或购买服务；未核实全部当前用途条款和配额                                                              |
| 本地 HTTP        | HTML、CSS、JS、Fastify JSON 200；POST 405；API no-store                                                      | 本地 HTTP，不是公网 TLS 或大陆数据                                                                            |
| 本地浏览器       | 系统 Chromium，390×844；24 个请求中 20 个正式样本全部成功；模拟 503 连续 3 次后停止，失败情况下分位数为 null | [截图](0014-vercel-local-mobile.png)是本地移动布局；Playwright 配套浏览器下载被策略拒绝，未冒充配套浏览器测试 |
| 代码检查         | Prettier、Oxlint、git diff 通过；jscpd 0 重复                                                                | 仅独立探针，非完整产品验收                                                                                    |
| Vercel 构建      | 最终部署 READY、staging、Node 24.x、sin1                                                                     | API 配置/状态证据；函数产物存在，静态内容不凭产物列表推定                                                     |
| 自定义 DNS       | CNAME 90215d081f0623e0.vercel-dns-017.com；misconfigured false；域名 verified true                           | 用户通过 hyp 面板保存记录，管理面板由 hyp 提供，权威 DNS 是 Cloudflare                                        |
| 证书与路由       | 证书列表包含精确主机；alias 指向所需 staging，无重定向和错误                                                 | API 证据；工具环境未直接完成公网 TLS 握手                                                                     |
| 用户测试         | 维护者报告 test successful 并要求结项                                                                        | 未提供测量明细，按上方边界记录                                                                                |
| 工具环境公网测试 | Vercel 官网/API 在配置令牌前被代理拒绝；配置后 API 可用；预览主机及自定义域名仍被 CONNECT 403 拒绝           | 环境网络策略限制，不是大陆封锁证据，没有绕过代理                                                              |

正式教育应用、数据库、邮件、语音、AI 调用及三儿童并发未由探针实现或验证。付费 AI 默认配置要求不变，但本探针没有任何 AI 调用。

## 可复核标识与生命周期

- 访问地址：<https://education-access-spike.hyp.app/>；原部署地址：<https://education-access-spike-ogpfo98vl-juanchaopan1.vercel.app/>。
- Vercel 项目：`prj_pVpgvnM9GoqNvxUAKN7FJmcThHDW` / `education-access-spike`；部署：`dpl_4HWHQJKv6nUYfwR6zfAP5nvVoL4G`。
- 上传源码提交：`5eb6313`；归档最终提交：`a847777a127129eb3634d01b78f49094b7431b7c`。
- 2026-11-04 20:45:56 UTC 自定义域名 alias 创建成功；证书：`cert_GYAgVYeQNFe86bzps72XDWIm`。
- 20:46:14 UTC 对自定义域名的直接请求为环境代理 CONNECT 403；用户成功报告发生在随后，不将两者混为同一测量地点。
- 只上传白名单 7 文件：package.json、锁文件、vercel.json、api/ping.js、public 下的 HTML/JS/CSS；没有账号数据、AI 密钥、Vercel 令牌或结果上传服务。
- REST 部署接口的预览目标是 `staging`；首次省略目标被标记为独立测试项目的 production，该部署及中间预览均已删除（DELETE 200）。项目公开访问只对无业务数据的测试项目设置。
- 现有测试站保留供复查，无 Git 自动发布关联；#20 安排替换/退役。应用源码和根目录 SPIKE.md 不进入正式 PR，通过归档标签保留。

## 官方来源快照

下列链接固定到读取时的 Git 提交。[来源清单](0014-hosting-sources.json)保存原文 SHA-256；可通过 GitHub contents API 在指定 revision 读取、Base64 解码并复核。价格、资格、超额行为和控制台能力在正式接入时复核。

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

Vercel 另有 [官方 Fastify 示例与集成源码](https://github.com/vercel/vercel/tree/84878e532142f0ac584953695658b324eb9e5b80/examples/fastify)。探针采用独立 Fastify inject 处理器接入 Node 函数，不能据此声称正式单仓构建已经兼容。

## 尚需验证的关键点

- **数据库与备份**：Neon Free 的计算/出站耗尽暂停、容量超额阻止写入；N1 的 Free Instant restore 表格与正文存在差异，不能承诺免费 PITR。#20/#29/#45 落实持久化、独立备份、恢复和删除语义。
- **预览隔离**：Railway 默认预览可复制基础环境变量，Neon 普通分支会复制数据；正式实现应使用隔离测试库/凭据，禁止生产家庭数据和密钥进入预览。
- **免费费用边界**：应用、PG、staging、预览、流量和备份合并计算；不能将最大配置当作免费用量包。当前没有 Vercel 试点月度用量实测，Hobby 资格、额度和耗尽行为由 #20 核实。
- **性能与大陆覆盖**：按 #51 记录地区/运营商/设备/时段，分开首次和热请求，报告尝试数、失败/超时、P50/P95/最大值。普通操作 2 秒、健康 AI 5 秒有效响应、10 秒引导仍是目标，用户此次成功报告没有提供这些数值。
- **正式集成**：#20 接入 React/TS7/Fastify 与 PostgreSQL，#16 验证邮件，#27 验证 AI 资格，#28 验证浏览器语音，#52 手动生产发布。该顺序不阻止独立的 #15 认证参数探针。
