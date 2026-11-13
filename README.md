# 小小探索家

中文儿童交互式解题网站。家长注册、邮箱验证、登录、退出及密码恢复，家长 KEY 管理、儿童兑换注册、PIN 持久登录和家长重置儿童 PIN，家长的学习摘要、练习安排、外部 AI 授权、家庭导出和删除都已实现。题库有第一道真实题目：一年级 / 数学 / 学而思的「一棵青菜有多重」，孩子在菜园天平的互动短片里操作，最后说出答案（见 [#49](docs/evidence/49/README.md)）；没有演示题或伪造的学习进度。彩铅配对和数轴追及两道题、进题后不用按键就能和老师对话、已打开页面在新版本发布后的自动刷新和生产部署尚未实现。各项真实 staging 验收范围与限制见文档，家庭框架的整体验收见 [#47](docs/evidence/47/README.md)。

## 本地开发

需要 Node.js 24、npm 11、Docker Compose。项目使用 TypeScript 7.0.2 编译与类型检查，Oxlint 检查代码，dependency-cruiser 通过 SWC 解析源码检查依赖边界。使用当前 checkout，无需额外 worktree。

```sh
npm ci
npm run dev
```

开发命令先构建共享库，再启动 Vite 和 Fastify。前端将 `/api` 代理至 API，题目列表来自真实的题库接口。

## 数据库与容器

```sh
cp infra/.env.example infra/.env
# 修改本地 POSTGRES_PASSWORD；不要提交 .env
docker compose --env-file infra/.env -f infra/docker-compose.yml up -d db
# 删除清单使用同一 PostgreSQL 服务中的另一个数据库
docker compose --env-file infra/.env -f infra/docker-compose.yml exec db createdb -U education education_ledger
# 在当前 shell 安全设置 DATABASE_URL 和 DELETION_LEDGER_URL，分别指向这两个开发数据库
npm run db:migrate
npm run test:db
```

`DATABASE_URL` 必须指向隔离的开发/测试数据库；数据库测试会创建并删除测试记录。迁移可重复运行，但不要在应用每个实例启动时并发执行。设置 `DELETION_LEDGER_URL` 时，迁移同时建立删除清单库的表。数据库测试要求两者分别指向名为 `education_test` 和 `education_ledger_test` 的隔离库。

```sh
docker compose --env-file infra/.env -f infra/docker-compose.yml up --build -d
docker compose --env-file infra/.env -f infra/docker-compose.yml ps
```

浏览题库和观看题目短片不依赖数据库；保存进度、提问和交答案需要孩子登录。`/health/live` 只证明进程存活；`/health/ready` 在账号服务已配置、数据库可访问且本版本所需迁移哈希已记入 Drizzle 迁移表时返回 200，其余返回 503；两者都不证明邮件或 AI 可用。就绪探针不执行迁移，不返回数据库配置。

### 隔离的双实例账号验证（#19）

```sh
npx playwright install chromium
npm run test:accounts
```

需要可用的本地 Docker daemon、Compose v2 和 OpenSSL。命令构建现有可移植镜像，生成临时密码、共享限流密钥和一天有效的 localhost 测试证书，用独立 Compose 项目启动 PostgreSQL、受控迁移、两个应用实例和 HTTPS 入口。数据库不映射主机端口；入口仅绑定回环地址 8443/8444，可用 `ACCOUNTS_PORT_A` / `ACCOUNTS_PORT_B` 选择空闲端口。两个入口用于精确选择实例，浏览器写请求始终使用第一个入口的同源地址。

**此命令会故意破坏测试库的初始迁移、停止测试数据库并删除整个测试卷。** 它不使用外部 `DATABASE_URL`，不连接开发或生产家庭库；不要把这份测试编排作为生产部署。测试结束后清理本次容器、网络、数据卷与临时证书，构建缓存保留。CI 将它作为 `ci` 的必要检查。实际记录与局限见 [#19 验收](docs/evidence/19/README.md)。

CA 公钥的临时副本与本地 TLS 文件存放在 `infra/.env.accounts-*`：该目录位于 Bake 允许读取的项目边界内，同时被 Git 和 Docker 构建上下文忽略。CA 仍只通过 BuildKit secret 挂载到 npm 安装步骤，不复制进镜像；不授予构建器额外的主机文件读取权限。

### 本地家长注册与登录（#17 / #18）

先迁移隔离开发数据库，再在启动 API 的环境中配置：

| 变量                   | 说明                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REGISTRATION_ENABLED` | 显式设为 `true`，同时启用本地注册与登录；默认关闭，不会连接数据库。                                                                                              |
| `DATABASE_URL`         | 已迁移的 PostgreSQL **直连或会话级连接**；本实现使用会话 advisory lock，不能接事务级连接池。                                                                     |
| `DELETION_LEDGER_URL`  | 可选。已迁移的删除清单库，必须是与 `DATABASE_URL` 不同的数据库，并且不在应用库的备份里。未设置时家长不能删除家庭。托管环境的证书放在 `DELETION_LEDGER_CA_CERT`。 |
| `AUTH_RATE_LIMIT_KEY`  | 独立随机密钥，建议生成 32 随机字节并编码为 hex；所有实例保持一致，不提交或放入 `VITE_*`。                                                                        |
| `APP_ORIGIN`           | 浏览器实际访问的精确 Origin；Vite 默认 `http://127.0.0.1:5173`，不能带路径或末尾 `/`。生产启用账号服务时必须为 HTTPS。                                           |

运行 `npm run dev` 后访问 `/family`。密码按原样使用异步 Argon2id 保存；同邮箱重复提交不会覆盖密码或创建多余家庭。注册不会签发会话或授予 KEY 权限。已有账号可点击“已有账号？去登录”；页面通过服务端会话显示真实邮箱验证状态。未验证家长只能读取自己的受限验证状态和退出，不开放家庭资料或 KEY。

已验证的家长登录后进入家长空间：`/family` 是总览（家庭码、每个孩子的累计记录、值得再练、已安排和设置），`/family/profile`、`/family/practice`、`/family/learning`、`/family/privacy` 分别是家庭（孩子、家庭码、注册 KEY 和家庭时区）、练习安排、学习记录、隐私与数据。总览只显示已有接口提供的数据：每个孩子做过的题数、独立完成和提示后完成的次数都按全部记录累计，不按周统计，也不显示学习时长。

**当前邮件适配器是隔离实现，不发送邮件。** 页面显示待验证申请与“尚未发送验证邮件”，不显示已验证或已投递。真实邮件令牌、持久投递意图、重发和恢复由 #21/#22 实现；本地注册测试不代表正式账号链路已可用。配置不完整时启动失败，未启用时表单显示服务尚未配置。

登录使用 `Secure / HttpOnly / SameSite=Lax / Path=/` 的 `__Host-education_session` cookie，数据库只存随机令牌的 SHA-256 哈希；不使用 localStorage 保存密码或会话。家长已验证会话空闲 12 小时、绝对 7 天；待验证会话 15 分钟。正常部署保留数据库及限流密钥即可保留有效登录。退出立即撤销当前会话；登录轮换当前 cookie，其他设备不自动退出。开发请使用 `127.0.0.1` / `localhost` 安全上下文；远程设备必须 HTTPS，不提供非 Secure cookie 回退。

私有 API 全部 `no-store`；登录须精确同源 Origin + JSON + 自定义头；退出额外校验绑定会话的 CSRF token。注册与登录共用数据库预算及哈希并发准入；原有 `registration_attempts` 表保留命名。新全局认证桶替代注册专用桶，升级时总量计数重新起算，邮箱与来源的原有计数继续有效。具体规则与尚待部署验证事项见 [#18 验收记录](docs/evidence/18/README.md)。

`npm run test:e2e` 在提供已迁移的隔离 `DATABASE_URL` 时运行真实注册和登录测试，并删除自己的账号夹具；未提供时明确跳过数据库相关浏览器用例。不要对真实家庭数据库运行测试。

云环境构建通过 BuildKit 临时挂载平台 CA，保持 TLS 校验；证书不复制进镜像。构建后移除开发依赖；生产迁移可在 API 目录执行 `node dist/database/migrate.js`，应作为受控发布步骤单独运行。生产前仍需完成发布检查。

### 家庭删除的维护任务（#44）

家长删除家庭时，删除先记入删除清单，再在同一事务里清除家庭数据。事务失败时会单独重试一次；仍失败的删除保持“处理中”，由维护命令按受理顺序完成：

```sh
npm run db:complete-deletions -w @education/api
```

部署后用 `node dist/complete-deletions.js` 按计划（例如每小时）运行，需要同样的 `DATABASE_URL` 和 `DELETION_LEDGER_URL`。命令只输出完成和失败的数量；有失败时以非零状态退出，下次运行会重试。

## 检查与组件预览

```sh
npm run check
npm run test:e2e
npm run test:visual
npm run storybook
```

端到端测试前需 `npm run build`，并安装匹配的 Playwright Chromium 和 WebKit：`npx playwright install chromium webkit`。本机已有兼容 Chromium 时可临时设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`；WebKit 仍需安装。`e2e/empty-framework.spec.ts` 用两个家庭走通家庭框架，需要 `DATABASE_URL` 和 `DELETION_LEDGER_URL`；它和家长账号测试各有自己的 API 服务，登录预算不和其他测试相加。`e2e/garden-balance.spec.ts` 让登录的孩子从题库走完菜园天平并交答案，需要 `DATABASE_URL`。`e2e/garden-narration.spec.ts` 逐句检查菜园短片的每句旁白都完整播放、没有被跳过，也检查录音下载失败和一句放不出来时短片会停下等孩子重试；它也在 WebKit 里运行，有 `DATABASE_URL` 时由登录的孩子听完整部短片，没有时由游客听到作答那一幕。

`npm run test:visual` 需要 Docker 正在运行：它在固定版本的官方 Playwright 镜像里构建应用和 Storybook，把每个 story 和关键页面在桌面、平板、手机三个视口下与经维护者评审的基准截图对比，并检查 WCAG 2.2 AA、键盘、减少动画、触摸目标和缩放。外观有意改变时用 `npm run test:visual -- --update` 重新生成基准，随代码提交并由维护者评审。做法见 [视觉基准与可访问性检查](docs/design/visual-baselines.md)。

## 题目旁白和审查录屏

```sh
npm run lesson:narrate -- garden-balance
npm run build
npm run lesson:review -- garden-balance
```

`npm run lesson:narrate -- <题目文件夹>` 按 `apps/web/src/features/learning/lessons/<题目文件夹>/script.ts` 的台词录旁白：只录缺少的和台词改过的句子，写进这道题的 `assets/`，并在 `assets/narration.json` 记下每个文件录的是哪句话、用的什么声音；单元测试按这份记录检查每句录音都按现在的台词、用现在配置的声音录过，改了台词或声音没重录时 `npm test` 不通过。声音写在 `scripts/lesson-voice.json`：`engine` 选合成引擎，引擎名下是它的设置，换声音只改这里。一道题录过的声音和配置的不同时，命令停下并说明，加 `--new-voice` 才把这道题的每一句都换成新声音重录。现在的声音是 edge-tts 的 `zh-CN-XiaoxiaoNeural`（语速 −14%、音高 +5Hz）：需要 [uv](https://docs.astral.sh/uv/) 和网络，第一次运行时 uv 安装固定版本的 `edge-tts`（LGPL-3.0，只作为本地工具运行）和它用的 Python；不需要账号或密钥，不产生费用，孩子使用时不调用它。edge-tts 用的是微软 Edge 未公开的在线朗读接口，生成要发布的音频的条款待维护者确认，见 [#42](docs/evidence/42/README.md#声音)；新录音在题目里试听过才能给孩子用。

`npm run lesson:review -- <题目标识>[/<版本>]` 按登记表里的题目录一遍完整路径：先 `npm run build`，再由 `review/walks.ts` 里这道题的走法在 Chromium 里从片名卡走到最后一幕，每句旁白放完才做下一步；孩子的登录、草稿和作答由脚本代替服务器回答，不需要数据库。需要 FFmpeg 和 Playwright 的 Chromium。输出在 `review-recordings/<题目标识>-<版本>/`（Git 不跟踪，别的测试也不会清掉它）：带页面声音的 `lesson-review.mp4`，以及记下每个媒体事件和它所放录音的 `playback-events.json`。录屏的每一帧都是完整的页面视口，和审查用的桌面 Chromium 视口一样大，孩子开始短片、页面进入全屏后也不裁切；有一帧不是完整视口时命令失败，不生成视频。录屏只说明能生成证据，仍要人看、人听。

## 配置和安全

`PAID_AI_ENABLED` 默认 `true`。只有同时配置后端 `OPENAI_API_KEY`、对应服务的资格开关（`OPENAI_TUTORING_ELIGIBLE`、`OPENAI_TRANSCRIPTION_ELIGIBLE`）并取得家长授权后才会调用供应商；缺少任何一项时不发出请求、不产生费用，孩子用题目提示继续，家长页的“外部 AI 授权”逐项显示“暂未启用”。资格开关只能在核实地区、条款和儿童数据处理资格后打开。密钥不得进入前端变量、源码或日志。

`AI_MONTHLY_BUDGET_USD` 可设置文字解题提示的部署级月度上限，留空表示预算未设置。配置及结算规则见 [AI 用量与费用上限](docs/evidence/39/README.md)。

`DEFAULT_TIME_ZONE`（默认 `Asia/Shanghai`，只接受 IANA 时区名）是还没有自己时区的家庭分天用的时区；家长打开家长空间时，网页把这台设备的时区填成家庭时区，家长也可以在「家庭」页修改。见 [家长总览](docs/design/family-overview.md#家庭时区)。

中国大陆可访问是发布条件；免费平台失败后转用用户提供的服务器/域名。Vercel staging 与 Gmail 试点方向见 ADR-0008/0010，正式全链路与 AI 仍需验证，不能将本地构建成功当成发布成功。

架构与需求见 [docs](docs/README.md)。

家长忘记密码可从登录页进入 `/family/recover`；正式邮件链接指向 `/family/reset`，只有提交新密码才会修改账号。30 分钟单次链接、共享发信限流和旧会话撤销的配置与边界见 [邮件文档](docs/deployment/mail.md)，本地证据及待验收项见 [#22](docs/evidence/22/README.md)。

### 家长管理孩子注册 KEY

已验证并重新登录的家长，可在 `/family/profile`（总览的“邀请孩子”）生成、复制、查看状态和撤销单次注册 KEY。KEY 原文仅生成时显示，有效期 24 小时；重新生成会撤销旧 KEY。密码登录或重新验证后的 5 分钟内可管理 KEY，已有旧会话需确认密码。孩子使用 KEY 的注册页面由 #24 实现。配置沿用现有账号服务，无需新增密钥；验证范围、截图与回退见 [#23 记录](docs/evidence/23/README.md)。

## 儿童兑换注册（#24）

启用已迁移的账号服务并安全配置 `PIN_PEPPER`（独立 32 随机字节、64 位 hex，跨实例/部署保持一致）后，访问 `/join`。已验证家长在 `/family/profile` 生成 KEY，儿童设置昵称和六位 PIN；成功后获得家庭码，可前往孩子登录。PIN 不明文保存，不放入浏览器构建变量；staging 使用 GitHub Secret `STAGING_PIN_PEPPER`。事务、幂等重试、限流和撤回边界见 [#24 验证记录](docs/evidence/24/README.md)。

## 儿童登录与退出（#25）

访问 `/child`，首次使用家庭码、注册昵称和六位 PIN 登录；家庭码可随时从家长页复制，不用背下来。成功后默认保持登录，有效访问顺延 180 天不活动期限，不设七天绝对退出。退出、清理 cookie 或长期不活动后使用原凭据登录，不重新注册或申请 KEY。家长与孩子在同一浏览器切换登录会替换当前会话，其他设备的独立会话不会因此退出。

页面默认仅在本设备记住家庭码与昵称，可取消；PIN 表单支持浏览器密码管理器，网站不在 localStorage/sessionStorage 保存明文 PIN 或会话令牌。儿童会话不能访问家长账号或管理 KEY。沿用现有 `PIN_PEPPER` 和数据库，不需新增秘密，不能更换 pepper 来排错。真实数据库、浏览器测试及已确认的 staging 验收范围见 [#25 记录](docs/evidence/25/README.md)；家长重置儿童 PIN 见下文 #26；新版本发布后已打开页面先保存草稿再刷新由 [#118](https://github.com/juanchaopan/education/issues/118) 实现。

## 家长重置孩子 PIN（#26）

在 `/family/profile` 的“孩子登录管理”选择孩子，经近期家长密码确认后，设置并再次输入新的六位 PIN。重置会退出这个孩子所有设备上的旧登录，家庭码、昵称与学习记录保留。新 PIN 必须不同于旧 PIN；不需要新的注册 KEY。重复或过时提交返回冲突并要求刷新，不能重复改变已经完成的结果。PR #80 已合并发布，维护者已确认旧登录及旧 PIN 失效、新 PIN 可登录、家庭码与昵称保留；实现、检查及验收范围见 [#26 记录](docs/evidence/26/README.md)。不需要新增秘密或数据库迁移。
