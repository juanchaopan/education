# #111 staging 应用库与删除清单库迁到 Neon

状态：代码和自动化测试完成；真实 staging 发布、家庭删除和每小时维护等维护者在 Neon 建好两个项目、设置秘密和 `STAGING_DATABASE_HOST` 后验收。决策见 [ADR-0014](../../adr/0014-neon-databases.md)，配置步骤见 [staging 文档](../../deployment/staging.md)。

## 实现

- `scripts/staging-database-env.mjs`：发布和每小时维护共用的数据库检查。应用库主机必须等于 Repository variable `STAGING_DATABASE_HOST`；应用库和删除清单库都按托管规则检查（只带 `sslmode=verify-full`，不用 `-pooler.` 主机或 6543 端口）；清单库主机必须不同于应用库。检查通过后返回按托管规则运行的环境、是否配置了清单库，以及传给 Vercel 运行时的数据库变量。
- `scripts/deploy-staging.mjs`：发布开始时运行上述检查，不通过就不创建候选；迁移和连接池使用检查返回的环境。
- `scripts/cleanup-staging-mail.mjs`：维护开始时运行同一检查，不通过时打印原因并退出，不连接数据库。
- `staging.yml`、`staging-mail-retention.yml`：传入 `STAGING_DATABASE_HOST`，没有默认值。
- API 只涉及测试和注释：数据库配置测试与 staging 加固测试使用不针对供应商的地址和说法，连接规则和运行时行为保持原样。

## 自动化测试

| 命令                                                      | 覆盖                                                                                                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:staging`（`staging-database-env.test.mjs`） | 主机一致（含大小写和空格）通过；变量缺少、主机不同、缺少连接串、`-pooler.` 主机、`sslmode=require`、多余参数失败；清单库同主机失败、不同主机通过并带出变量 |
| `npm test -w @education/api`（`database-config.test.ts`） | 直连地址和可选证书；事务连接池、6543、TLS 覆盖和多余参数被拒绝；清单库沿用同样规则                                                                         |
| 本机运行 `cleanup-staging-mail.mjs`、`deploy-staging.mjs` | 缺少 `STAGING_DATABASE_HOST`、主机不一致、缺少 `verify-full` 时在连接数据库之前失败并给出原因                                                              |

## 检查的边界

- 清单库的检查只比较主机。同一 Neon 项目的分支和计算端点主机不同，检查分不出来；清单库放在另一个 Neon 项目里，由 staging 文档的配置步骤保证。
- `STAGING_DATABASE_HOST` 必须是只服务应用库的直连主机。填成多个数据库共用的连接池主机时，同一主机上的其他数据库也能通过检查。
- staging 加固只处理 anon/authenticated 角色；staging 文档要求不启用 Neon 的 Data API。

## 待维护者验收

- [ ] 在 Neon 新建 `education-staging`、`education-staging-ledger`（Singapore），按 staging 文档设置 `STAGING_DATABASE_URL`、`STAGING_DELETION_LEDGER_URL`、`STAGING_DATABASE_HOST`，两个证书秘密留空。
- [ ] main 的 staging 发布通过迁移、加固、账号冒烟和域名推广，实际 deployment 在 sin1。
- [ ] 用合成账号在 staging 删除家庭：删除成功、旧会话失效。
- [ ] 每小时维护成功，打印完成和失败的删除数量。

旧 Supabase 项目 `telkaiyxprpetmqthyhn` 是否暂停或删除由维护者决定，流程不自动处理。
