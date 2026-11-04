# 小小探索家

中文儿童交互式解题网站。当前是**空框架**，没有演示题或正式题目，也尚未实现账号注册、学习记录、AI 对话或生产部署。页面中的未来能力说明不代表功能已开放。

## 本地开发

需要 Node.js 24、npm 11、Docker Compose。使用当前 checkout，无需额外 worktree。

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

中国大陆可访问是发布条件；免费平台失败后转用用户提供的服务器/域名。托管、邮箱、AI 尚未选定，不能将本地构建成功当成发布成功。

架构与需求见 [docs](docs/README.md)。
