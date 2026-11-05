# #20 staging 接入记录

状态：实现与本地验证；尚未取得真实 staging 发布/数据库验收证据，不关闭 #20。维护者提供 Supabase 项目编号；连接串与部署秘密只通过 GitHub 安全配置。

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

维护者已报告 GitHub staging 秘密和启用变量配置完成，PR #60 已经人工审查并合并；仍需触发修复合入后验收真实 Supabase 连接/权限、受控迁移、账号冒烟、域名切换、重新部署持久化和失败回退。独立开发环境允许下载 Actions 日志的草稿尚未发布；这不等于 GitHub runner 网络不可用。

Gmail 继续隔离，不发送任何邮件；AI 没有供应商调用。#21/#22 正式邮件、#47 更新刷新、#51 大陆真机链路及 #52 生产发布尚未完成。详见 [部署步骤](../../deployment/staging.md)。

## PR #60 合并后的触发缺口

PR #60 已经维护者 human-reviewed 后由 app/github-actions squash 合并，main 为 `c2782443de721c97d97aa780590df96cf623d1bc`。维护者报告 GitHub secrets 与 STAGING_ENABLED=true 已配置。查询这个 main SHA 的 Actions runs 返回 total_count=0；PR CI 的 head 为 feature 提交 `6f123fb58bbc4001cd720d9647e4b535b25156b0`，不能将它当作 main CI。

[GitHub 官方规则](https://github.com/github/docs/blob/main/data/reusables/actions/actions-do-not-trigger-workflows.md) 明确 GITHUB_TOKEN 普通事件不递归触发，workflow_dispatch/repository_dispatch 是例外。本任务补充 CI 手动派发入口，staging 从可信 main 查询已合并 PR 与精确 SHA，派发真实 main CI 并等待成功，再发布；不增加 PAT、不放宽分支保护、不自加人工确认标签。

新增九项触发测试：bot merge 缺少 push CI、精确 main 成功、排队/运行/失败、未合并、外仓库、手动重试与旧/PR 成功拒绝。与原有部署/函数测试共 20 项通过；完整常规检查和 0 clones 验证继续执行。实际 main CI 与数据库发布仍待这项修复合入后的线上运行，不提前勾选 #20 验收。

## main CI 与首次数据库发布尝试

显式 staging 运行 41967486004 成功派发 main 的真实 CI 41967500357，精确提交为 `b100d2d3bff307a211dda3782d1f347ee92d163e`；app、accounts、duplication、ci 均成功。未观测到随后自动创建的 staging 完成回调运行，因此将等待 CI 与继续发布收拢到同一个 staging 准备任务，不再依赖递归完成事件。

显式继续运行 41968154844：prepare、安装和构建成功，发布步骤失败。维护者提供安全错误行 `Staging release failed: self-signed certificate in certificate chain`。这说明当前 Supabase 连接还需要官方根证书；要求下载并安全配置 STAGING_DATABASE_CA_CERT，不关闭 TLS 验证。数据库/alias 验收仍未通过。

等待流程新增六项用例：同一次运行等待后继续、复用进行中 CI、新 CI 失败、旧失败与新 run 区分、main 更新与超时；staging 相关共 26 项通过。CI 等待超时有明确上限，失败不产生发布许可。后续发布错误增加安全 GitHub annotation，避免必须下载被环境代理阻止的完整日志。
