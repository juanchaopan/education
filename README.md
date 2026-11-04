# 小小探索家

中文儿童交互式解题网站。当前是**空框架**，已实现家长提交注册并保存待验证账号；没有演示题或正式题目，邮箱验证、登录、儿童关联、学习记录、AI 对话和生产部署尚未实现。

## 本地开发

需要 Node.js 24、npm 11、Docker Compose。项目使用 TypeScript 7.0.2 编译与类型检查，Oxlint 检查代码，dependency-cruiser 通过 SWC 解析源码检查依赖边界。使用当前 checkout，无需额外 worktree。

```sh
npm ci
npm run dev
```

开发命令先构建共享库，再启动 Vite 和 Fastify。前端将 `/api` 代理至 API，题目列表来自真实的空题库接口。

## 数据库与容器

```sh
cp infra/.env.example infra/.env
# 修改本地 POSTGRES_PASSWORD；不要提交 .env
docker compose --env-file infra/.env -f infra/docker-compose.yml up -d db
# 在当前 shell 安全设置 DATABASE_URL，指向这个开发数据库
npm run db:migrate
npm run test:db
```

`DATABASE_URL` 必须指向隔离的开发/测试数据库；数据库测试会创建并删除测试记录。迁移可重复运行，但不要在应用每个实例启动时并发执行。

```sh
docker compose --env-file infra/.env -f infra/docker-compose.yml up --build -d
docker compose --env-file infra/.env -f infra/docker-compose.yml ps
```

当前 API 不依赖数据库提供空题库，健康接口只证明进程存活，不证明账号、数据库或 AI 就绪。数据库 schema 仅为初始基础，不能代替家庭权限实现。

### 本地家长注册（#17）

先迁移隔离开发数据库，再在启动 API 的环境中配置：

| 变量                   | 说明                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `REGISTRATION_ENABLED` | 显式设为 `true`；默认关闭，不会连接数据库。                                                                        |
| `DATABASE_URL`         | 已迁移的 PostgreSQL **直连或会话级连接**；本实现使用会话 advisory lock，不能接事务级连接池。                       |
| `AUTH_RATE_LIMIT_KEY`  | 独立随机密钥，建议生成 32 随机字节并编码为 hex；所有实例保持一致，不提交或放入 `VITE_*`。                          |
| `APP_ORIGIN`           | 浏览器实际访问的精确 Origin；Vite 默认 `http://127.0.0.1:5173`，不能带路径或末尾 `/`。生产启用注册时必须为 HTTPS。 |

运行 `npm run dev` 后访问 `/family`。密码按原样使用异步 Argon2id 保存；同邮箱重复提交不会覆盖密码或创建多余家庭。注册不会签发会话或授予 KEY 权限。

**当前邮件适配器是隔离实现，不发送邮件。** 页面显示待验证申请与“尚未发送验证邮件”，不显示已验证或已投递。真实邮件令牌、持久投递意图、重发和恢复由 #21/#22 实现；本地注册测试不代表正式账号链路已可用。配置不完整时启动失败，未启用时表单显示服务尚未配置。

`npm run test:e2e` 在提供已迁移的隔离 `DATABASE_URL` 时运行真实注册测试，并删除自己的账号夹具；未提供时明确跳过这两项数据库相关浏览器用例。不要对真实家庭数据库运行测试。

云环境构建通过 BuildKit 临时挂载平台 CA，保持 TLS 校验；证书不复制进镜像。构建后移除开发依赖；生产迁移可在 API 目录执行 `node dist/database/migrate.js`，应作为受控发布步骤单独运行。生产前仍需完成发布检查。

## 检查与组件预览

```sh
npm run check
npm run test:e2e
npm run storybook
```

端到端测试前需 `npm run build`，并安装匹配的 Playwright Chromium：`npx playwright install chromium`。本机已有兼容 Chromium 时可临时设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`；正式视觉基准应在固定版本的官方 Playwright 镜像中建立和评审。

Storybook 展示空、加载、错误和长文字状态。尚未建立经评审的像素回归基准；端到端测试和截图产物不能被称为已完成的视觉回归。

## 配置和安全

`PAID_AI_ENABLED` 默认 `true`。当前没有调用供应商的接口，不产生 AI 费用。后续实现仍需后端密钥、家长授权、地区与条款资格验证，以及 token 控制。密钥不得进入前端变量、源码或日志。

中国大陆可访问是发布条件；免费平台失败后转用用户提供的服务器/域名。Vercel staging 与 Gmail 试点方向见 ADR-0008/0010，正式全链路与 AI 仍需验证，不能将本地构建成功当成发布成功。

架构与需求见 [docs](docs/README.md)。
