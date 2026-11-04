---
paths:
  - 'apps/api/**'
---

# Node.js 规范：api

来源：Oxlint 的 TypeScript 规则、Node.js 官方文档。格式由 Prettier 负责，类型由 TypeScript 7 严格模式检查，常见问题由 Oxlint 检查，分层由 dependency-cruiser（`.dependency-cruiser.cjs`，`npm run arch`）检查；这里写需要判断的部分。

## 分层

按功能分目录，每个功能内部分层：

```
src/
├── <功能>/
│   ├── routes/         接收请求、校验输入、调用 services、返回结果
│   ├── services/       业务逻辑和事务边界
│   ├── repositories/   数据访问
│   └── domain/         领域模型和业务规则
├── shared/             几个功能共用的配置、错误类型、工具
└── index.ts            组装各功能、启动服务
```

由 `npm run arch` 强制：

- 依赖方向只能是 routes → services → repositories → domain。里面的层不能依赖 routes；routes 不能跳过 services 直接访问 repositories。
- domain 只放业务规则，不依赖其他层、Web 框架和数据库驱动。
- services 不依赖 Web 框架（只允许引用类型），这样业务逻辑可以脱离 HTTP 单独测试。
- 功能之间不互相引用；共用的东西放进 `src/shared/`，shared 不依赖任何功能。
- 不允许循环依赖。
- 用 NestJS 时，按它的模块组织代码（`<功能>/<功能>.controller.ts`、`.service.ts`、`.repository.ts`），把 `.dependency-cruiser.cjs` 里按目录的规则改成按文件名后缀匹配，分层的要求不变。

## 类型和校验

- 不用 `any`。外部输入（请求体、查询参数、环境变量、消息）在 routes 里用 schema 校验（例如 zod），校验后的类型再往里传。
- 配置在启动时一次性读取并校验，缺了就报错退出。
- 用 ES 模块，相对导入写上 `.js` 扩展名（NodeNext 模块解析的要求）。

## 异步和错误

- 每个 Promise 都要 await 或显式处理。当前 Oxlint 运行语法规则，未启用类型感知的 no-floating-promises，审查不能假定此规则已被自动检查。
- 错误统一由错误处理中间件转换成响应，不把堆栈返回给调用方。
- 调用外部服务都设置超时；只对幂等的操作做重试。
- 请求处理路径上不用同步的文件和加密 API（`readFileSync`、`pbkdf2Sync` 等），它们会卡住整个进程。

## 运行

- 日志用结构化日志库（例如 pino），每个请求带上追踪编号；不打印密码、令牌和完整的个人信息。
- 收到 SIGTERM 时优雅停机：停止接收新请求，处理完手上的再退出。
- 提供健康检查接口。
- 进程内不保存请求之间的状态，这样才能多实例部署。

## 测试

- 用 Vitest。services 用假的 repository 测业务逻辑；接口用框架自带的注入方式测（例如 Fastify 的 `inject`）或 supertest。
- 数据库用真实的测试实例，不用模拟的查询结果。
