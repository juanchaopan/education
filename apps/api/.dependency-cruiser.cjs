// 架构规则：routes → services → repositories 分层、领域层不依赖框架和数据库、功能之间隔离。
// 说明见 .claude/rules/ 里本组件的规范。由 scripts/arch-check.mjs 运行（npm run arch），违反任何一条，自检和 CI 都会失败。
module.exports = {
  forbidden: [
    {
      name: 'routes-not-imported-by-inner-layers',
      comment: 'routes 是最外层，里面的层不能反过来依赖它。',
      severity: 'error',
      from: { path: '/(services|repositories|domain)/' },
      to: { path: '/routes/' },
    },
    {
      name: 'repositories-only-from-services',
      comment: '数据访问只能由 services 调用，routes 不能跳过 services。',
      severity: 'error',
      from: { path: '/(routes|domain)/' },
      to: { path: '/repositories/' },
    },
    {
      name: 'domain-is-pure',
      comment: '领域层只放业务规则，不依赖其他层、Web 框架和数据库驱动。',
      severity: 'error',
      from: { path: '/domain/' },
      to: {
        path: '/(routes|services|repositories)/|fastify|express|@nestjs|hono|pg|mysql2|mongodb|mongoose|@prisma|prisma|typeorm|drizzle-orm|kysely',
      },
    },
    {
      name: 'services-not-framework-bound',
      comment: 'services 不依赖 Web 框架，这样业务逻辑可以脱离 HTTP 单独测试。',
      severity: 'error',
      from: { path: '/services/' },
      to: { path: 'fastify|express|@nestjs/platform|hono', dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'features-isolated',
      comment: '功能之间不互相引用，共用的东西放进 src/shared/。',
      severity: 'error',
      from: { path: '^src/([^/]+)/' },
      to: { path: '^src/[^/]+/', pathNot: ['^src/$1/', '^src/shared/'] },
    },
    {
      name: 'shared-independent',
      comment: 'shared 不依赖任何功能。',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/[^/]+/', pathNot: '^src/shared/' },
    },
    {
      name: 'no-circular',
      comment: '不允许循环依赖。',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '[.]test[.]ts$' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
};
