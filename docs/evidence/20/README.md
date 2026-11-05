# #20 staging 接入记录

状态：#20 核心验收通过。main 合并后自动部署隔离 Singapore staging，数据库迁移、账号冒烟、自动域名绑定及真实浏览器重部署持久化均已验证；PR 预览按已记录的免费资源限制使用隔离 staging 退路。维护者提供 Supabase 项目编号；连接串与部署秘密只通过 GitHub 安全配置。

以下保留各实施阶段的原始结果；阶段中写明的失败、未完成和临时区域不代表当前状态。最近的真实发布与浏览器结果见文末。

## 范围

- 先独立提交组装/监听重构；账号行为不变。正式入口支持容器与 Vercel raw Node 请求处理器，保留 Fastify 流式请求解析和限制。
- Node 24、TypeScript 7、现有 PostgreSQL/Drizzle 与应用自管账号。采用维护者已有 Supabase 的专用项目，不启用 Supabase Auth，不复用生产数据或 Gmail 探针。
- 精确通过 CI 的 main → 候选构建 → 受控迁移/权限加固 → 账号冒烟 → 自定义 staging alias。生产没有自动发布路径。
- 版本文件绑定构建 SHA；Supabase 连接要求验证 TLS、直连或 Session pooler。Transaction pooler 不支持现有会话级 advisory lock。

## 已核实的外部元数据

Vercel API 返回工作区 juanchaopan1 套餐 Hobby。创建独立 education-staging 项目 `prj_UYpAbi3rHNsoEdnOYGWiOo8L2WP0`，随后通过 PATCH 配置 Node 24，关闭合成测试站的默认平台登录保护；没有 Git 自动部署连接、真实生产站点变动、域名切换或购买套餐。

POST create-project 最初拒绝额外字段 nodeVersion；按实际错误改用创建后 PATCH，读取确认成功，未扩大权限。现有 `education-access-spike.hyp.app` alias 读取仍指向原探针 `dpl_4HWHQJKv6nUYfwR6zfAP5nvVoL4G`。无凭据打包测试中，未显式指定 target 的首次新项目构建被 Vercel 标为内置 production target；它只属于这个独立测试项目，没有真实账号或 hyp.app alias。已删除该构建，发布代码增加显式 `target: staging` 并纳入回归断言。第二次构建 `dpl_9t31sq14k8jw1eVDLK6qrBVbCSns` 确认为 staging / READY，提交 `86b7d95ea68a466cfc4ee72c5ad9340ce4996c91`，无数据库/邮件/AI 凭据，注册关闭。构建 READY 不证明函数运行或账号链路通过，维护者随后回传函数 500；从 Vercel 运行日志确认 `@fastify/static` 的 CommonJS require 与 ESM 依赖不兼容（ERR_REQUIRE_ESM）。本地以 `--no-experimental-require-module` 重现失败；改为 Vercel 静态路由提供 HTML/资源、函数仅组装 API，容器入口继续按需加载静态插件。回归与完整检查通过，修复提交 `a5d4dae040456e72e2d5b35052401adf61efa4fa` 的新候选 `dpl_dnN4NVYEU8LjhQXhQS64yHULNq7t` 已确认 staging / READY / sin1，维护者打开新候选后回传存活 `{"status":"ok"}` 和完全匹配修复提交的版本 JSON；这是维护者报告的真实线上函数/版本验证，非数据库验收。见 [修复构建记录](vercel-candidate-ready.json)。安全元数据见 [构建记录](vercel-packaging.json)。

维护者提供 Supabase Ref `telkaiyxprpetmqthyhn`；区域、实际套餐和凭据未读，不推断其资源能力。

## 验证

- `npm run check`：API 48、web 8、工具链/工作流 23 项通过；格式、lint、架构、TypeScript 7、应用和 Storybook 构建通过。
- `npm run build:staging`：以完整提交标识生成版本文件并成功构建；真实 Vercel Node 24 / TS7 monorepo 打包已 READY，运行结果与数据库未计为通过。
- `npm run test:staging`：11 项通过，包括真实编译函数的 HTTP/静态文件/请求解析，以及候选失败、过期提交、错误项目、alias 不确定结果和读回校验。不跳过或重试失败场景。
- 隔离 PostgreSQL 17：迁移和 `npm run test:db` 共 17 项通过，包括先撤销默认授权再建表，以及 RLS/客户端角色权限验证。
- 原有桌面/手机 `npm run test:e2e -- --workers=2`：12 项通过（31.4 秒）；无跳过。真实 HTTPS 双实例 `npm run test:accounts`：6 项通过（1.3 分钟），其中 B 使用正式函数处理器。
- `npx --no-install jscpd .`：0 clones；`git diff --check` 通过。没有依赖升级、业务 SQL 迁移、Gmail/AI 调用或生产部署。

首次新增版本与 TLS 配置用例先失败，再实现通过。双实例首次启动轮询遇到 502；诊断重跑时六项通过。启动检查改为分别等待 A/B 的存活接口（30 秒明确启动预算），仍严格验证失败迁移时就绪/注册 503；没有跳过、放宽错误状态或将首次失败计为通过。

没有改产品外观，不需要新像素基准；既有真实浏览器功能检查仍执行。独立 simplify/code-review/security-review 技能在此环境缺失，按项目规则人工检查并如实记录，付费审查跳过不当作通过。

## 官方来源（2026-11-04，America/Toronto）

Supabase 官方仓库快照：`ab54becc60debd614a4496742d5fcf787be4bb60`，读取其文档，实际账户能力仍需控制台/API 验证：

- [Connecting to Postgres](https://github.com/supabase/supabase/blob/ab54becc60debd614a4496742d5fcf787be4bb60/apps/docs/content/guides/database/connecting-to-postgres.mdx)：5432 Session pooler 可用 IPv4；6543 Transaction pooler 不保留会话锁；验证 TLS 需正确根证书。运行器强制 verify-full，必要时使用 Supabase 下载的根证书。
- [Branching usage](https://github.com/supabase/supabase/blob/ab54becc60debd614a4496742d5fcf787be4bb60/apps/docs/content/guides/platform/manage-your-usage/branching.mdx)：分支资源单独计量，不受 Spend Cap 覆盖；当前没有获批费用与空库生命周期配置，采用隔离 staging 退路，不启用 PR 预览。
- [Free project pausing](https://github.com/supabase/supabase/blob/ab54becc60debd614a4496742d5fcf787be4bb60/apps/docs/content/guides/platform/free-project-pausing.mdx)：Free 低活跃项目可能在七天观察期后暂停；不将免费解释为永不休眠。
- Vercel 官方 Fastify/Node 适配器源码已读取作接入参考；当前 Hobby 条款与函数限制网页、Gmail 支持页仍在开发环境代理 CONNECT 403，未宣称已核实当前额度或发信资格。

## 未完成与验收边界

维护者已配置 GitHub staging 秘密和启用变量。真实 Supabase 连接/权限、受控迁移、账号冒烟、域名切换和浏览器同数据库重部署持久化的结果见文末；失败不推广候选和 alias 不确定时保留候选由回归测试覆盖，早期失败与恢复也保留在下方。开发环境完整 Actions 日志下载仍受限，后续使用安全 annotation 和提供商元数据核对；这不等于 GitHub runner 网络不可用。

Gmail 继续隔离，不发送任何邮件；AI 没有供应商调用。#21/#22 正式邮件、#47 更新刷新、#51 大陆真机链路及 #52 生产发布尚未完成。详见 [部署步骤](../../deployment/staging.md)。

## PR #60 合并后的触发缺口

PR #60 已经维护者 human-reviewed 后由 app/github-actions squash 合并，main 为 `c2782443de721c97d97aa780590df96cf623d1bc`。维护者报告 GitHub secrets 与 STAGING_ENABLED=true 已配置。查询这个 main SHA 的 Actions runs 返回 total_count=0；PR CI 的 head 为 feature 提交 `6f123fb58bbc4001cd720d9647e4b535b25156b0`，不能将它当作 main CI。

[GitHub 官方规则](https://github.com/github/docs/blob/main/data/reusables/actions/actions-do-not-trigger-workflows.md) 明确 GITHUB_TOKEN 普通事件不递归触发，workflow_dispatch/repository_dispatch 是例外。本任务补充 CI 手动派发入口，staging 从可信 main 查询已合并 PR 与精确 SHA，派发真实 main CI 并等待成功，再发布；不增加 PAT、不放宽分支保护、不自加人工确认标签。

新增九项触发测试：bot merge 缺少 push CI、精确 main 成功、排队/运行/失败、未合并、外仓库、手动重试与旧/PR 成功拒绝。与原有部署/函数测试共 20 项通过；完整常规检查和 0 clones 验证继续执行。实际 main CI 与数据库发布仍待这项修复合入后的线上运行，不提前勾选 #20 验收。

## main CI 与首次数据库发布尝试

显式 staging 运行 41967486004 成功派发 main 的真实 CI 41967500357，精确提交为 `b100d2d3bff307a211dda3782d1f347ee92d163e`；app、accounts、duplication、ci 均成功。未观测到随后自动创建的 staging 完成回调运行，因此将等待 CI 与继续发布收拢到同一个 staging 准备任务，不再依赖递归完成事件。

显式继续运行 41968154844：prepare、安装和构建成功，发布步骤失败。维护者提供安全错误行 `Staging release failed: self-signed certificate in certificate chain`。这说明当前 Supabase 连接还需要官方根证书；要求下载并安全配置 STAGING_DATABASE_CA_CERT，不关闭 TLS 验证。数据库/alias 验收仍未通过。

等待流程新增六项用例：同一次运行等待后继续、复用进行中 CI、新 CI 失败、旧失败与新 run 区分、main 更新与超时；staging 相关共 26 项通过。CI 等待超时有明确上限，失败不产生发布许可。后续发布错误增加安全 GitHub annotation，避免必须下载被环境代理阻止的完整日志。

## 固定 Singapore 与保留现有 Supabase（2026-11-05）

PR #62 经维护者确认已合并为 main `10600074c5fd3209b9c40c358d92bb70a88d2301`。单次 staging 41970172391 内派发并等待 CI 41970190634；CI app/accounts/duplication/ci 全部成功，随后同一 staging 自动进入 deploy，证明不再需要二次回调。该版本就绪探测为 503，Vercel 日志确认原始连接异常被捕获，但当时未记录分类，不能据此声称具体异常代码。

维护者提供 Supabase 区域 us-east-1。临时将 staging 函数设为 iad1 后，候选 `dpl_4kKkduS51qUiL3gNHAsho4BSnB8H` 构建为 READY，工作流 41971380175 及后续尝试到达 alias POST 后返回 403，意味着此前迁移与账号冒烟未抛错；没有捏造丢失的请求耗时。使用已配置的云端 Vercel 身份完成该已通过冒烟候选的手工 alias 绑定并读回 project/deployment ID。这是手工恢复，不是 GitHub 自动发布成功。

确认旧探针仍拥有 Project Domain 后，读取 Vercel 官方 SDK moveProjectDomain 端点及请求模式，使用原子移动将 education-access-spike.hyp.app 转交 staging 项目；读回 verified=true，既有 alias 指向保持不变。

维护者随后明确不新建 Supabase，并要求 Vercel 仍为 Singapore。已将项目默认函数区域恢复 sin1；现有数据库与凭据保持不变，现有已验证版本仅作为退路。当前代码扩展跨区连接建立预算、增加不含私密信息的错误分类及有界启动探测；实际 sin1 发布与持久化尚待验收。未宣称故障一定由网络延迟造成，下一轮日志将提供允许列表中的错误分类。

## Singapore 首次成功发布与合并时序（2026-11-05 UTC）

PR #63 经维护者确认后合并为 `16fcaa675b3887ae92c6261ffdf57cd79ff1c848`。staging 运行 [41974913097](https://github.com/juanchaopan/education/actions/runs/41974913097) 的准备任务于 05:35:21 结束并跳过发布，PR 于 05:35:24 才合并。原来的十五秒关联检查窗口早于原生自动合并完成。回归用例先重现三十秒后才合并时漏派发的问题，再将等待限定为每五秒检查、最多两分钟；无论等多久，未合并、外仓库和错误 head 都不获得发布许可。超过窗口的异常情况仍需人工触发，不声称无限等待。

手动启动 staging [41975178909](https://github.com/juanchaopan/education/actions/runs/41975178909)，在同一次运行中派发并等待精确 main 的完整 CI [41975192383](https://github.com/juanchaopan/education/actions/runs/41975192383)。两者最终均为 success。发布候选为 `dpl_9Ez9gzBfmZ2urRX8AmrxJ8K2TJem`，URL 为 `education-staging-3qrzivxqd-juanchaopan1.vercel.app`；Vercel API 读回 READY、target staging、regions `["sin1"]`。Supabase 仍是现有 us-east-1 项目。

发布步骤成功意味着受控迁移、表权限加固、精确版本/数据库就绪及注册/登录/会话/退出/旧 cookie 拒绝检查均通过，合成账号由 finally 定向清理。GitHub Actions 使用已配置的 STAGING_VERCEL_TOKEN 成功提交域名绑定，不再返回之前的 403。独立 API 读回 education-access-spike.hyp.app 的 deploymentId 与上述候选相等，projectId 为 staging 项目。没有取得完整日志中的逐次耗时，不补造延迟数字，也不将这次发布等同于大陆性能达标。

合并等待修复的 staging 回归共 35 项通过，完整常规检查通过，jscpd 为 0 clones。真实浏览器刷新、同数据库重新部署后的账号和会话持久化仍待维护者验证；本节不提前勾选该项。隔离邮件仍返回 not-sent，没有开启 Gmail 或 AI。后续将通过本修复的实际自动触发核对发布链路，不能把上述手动启动冒充合并自动触发。

## 真实浏览器与同数据库重部署持久化（2026-11-05 UTC）

维护者在稳定域名 /family 注册一个仅用于 staging 的合成家长账号，自定密码且未发送到聊天；登录后刷新仍显示“我的家长账号”。此时稳定域名指向 `dpl_9Ez9gzBfmZ2urRX8AmrxJ8K2TJem`。

随后启动 [41975900571](https://github.com/juanchaopan/education/actions/runs/41975900571)，同一代码 SHA、同一 Supabase 项目和同一限流密钥重新构建/迁移/冒烟/推广，最终 success。独立 API 读回域名已指向不同 deployment `dpl_5w1pby48yy6yrnzejxJKq6GGg9k5`，regions 为 `["sin1"]`、READY、target staging；不是仅刷新同一个实例。维护者在切换后确认：“刷新仍登录，退出和重新登录都成功”。据此记录账号和服务器端会话跨部署保留、浏览器刷新恢复、退出和原密码重新登录通过。当前未验证邮箱账号只有验证状态访问权，未将其当作完整家庭管理或孩子账号验收。

测试没有发送真实邮件、录音、绘图或儿童信息，没有访问生产数据库；未执行项目删除、全库清空或密码轮换。

## 合并后的真实自动发布验收（2026-11-05 UTC）

PR #64 合并为 main `1ee1321fe1ebb5413eab1d7fd645d513862da3fa`。由 `workflow_run` 自动触发的 staging [41976030636](https://github.com/juanchaopan/education/actions/runs/41976030636) 在 PR 合并前开始，等待合并后选择该精确 main SHA，并显式派发完整 CI [41976075649](https://github.com/juanchaopan/education/actions/runs/41976075649)。CI 的 app、accounts、duplication、ci 全部 success；同一次 staging 的 prepare 与 deploy 最终均 success，配置提醒任务按预期 skipped。本次没有手动派发 staging，区别于此前两次人工启动的发布。工作流事件的 headSha 为创建时的旧 main；实际发布版本以准备任务选择的 main 和候选构建的 educationRevision 核对。

Vercel API 读回候选 `dpl_ANwUBUBj5WPVmXLZTYkXvSXSs1Xh`：READY、target staging、regions `["sin1"]`，educationRevision 为上述 `1ee1321…`，URL 为 `education-staging-4bw3jl8wz-juanchaopan1.vercel.app`。再次独立读取稳定域名 education-access-spike.hyp.app，projectId 为 `prj_UYpAbi3rHNsoEdnOYGWiOo8L2WP0`、deploymentId 为同一候选。说明精确 main CI、受控迁移、账号薄链路、合成账号清理和域名推广已按自动流程完成。

#20 两项核心标准据此验收：自动发布已实测；逐 PR 独立数据库没有获准的免费生命周期资源，按任务约定记录限制并采用隔离 staging，没有创建待清理的 PR 数据库。生产仍手动发布。浏览器同数据库跨部署登录验证见上一节，不将未验证邮箱账号当作完整家庭权限验收。

邮件交接中的 Google 资格/额度、真实发信与失败恢复仍交 #21/#22 在正式启用前完成；当前使用隔离邮件适配器且不声称已送达。#47 更新刷新、#51 大陆真机完整链路、#52 生产发布继续开放，不能把这次 staging 成功当作这些任务已完成。
