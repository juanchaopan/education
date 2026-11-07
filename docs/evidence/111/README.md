# #111 staging 应用库与删除清单库迁到 Neon

状态：验收完成。staging 的应用库和删除清单库运行在 Singapore 的两个 Neon Free 项目上，发布、家庭删除和每小时维护都已在真实 staging 上通过。决策见 [ADR-0014](../../adr/0014-neon-databases.md)，配置步骤见 [staging 文档](../../deployment/staging.md)。

## 实现

PR #113。

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

PR #113 的 CI（含真实 PostgreSQL 的 `test:db` 和浏览器测试）全部通过。

## staging 验收（2026-11-07）

维护者在 Neon 新建 `education-staging`、`education-staging-ledger`（AWS Asia Pacific (Singapore)），设置了 `STAGING_DATABASE_URL`、`STAGING_DELETION_LEDGER_URL` 和 `STAGING_DATABASE_HOST`，删除了两个证书秘密。

| 检查               | 结果                                                                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 缺少主机变量时发布 | 合并后的自动发布 [42399600976](https://github.com/juanchaopan/education/actions/runs/42399600976) 运行时变量还没设置，报 `Missing staging configuration: STAGING_DATABASE_HOST`，在连接数据库之前失败，稳定域名不变                                                 |
| 发布               | 手动发布 [42400044769](https://github.com/juanchaopan/education/actions/runs/42400044769) 成功：两个库完成迁移和加固，账号冒烟通过，域名切到 `dpl_EvFtJ2UJbAzQqkC3B8LwuiLHnp1B`；`/version.json` 为 `334475c`，响应头 `x-vercel-id` 显示 sin1                       |
| 冒烟耗时           | 版本 507 ms、就绪 464 ms、注册 485 ms、登录 547 ms、读取会话 324 ms、退出 315 ms、旧会话 401 用时 323 ms                                                                                                                                                            |
| 家庭删除           | 用合成家长账号（加号地址的维护者邮箱）注册、收取并确认验证邮件、重新登录后，在家长空间输入确认短语和密码删除家庭。页面显示“家庭已删除”（[截图](assets/staging-family-deleted.png)），浏览器不再保留会话 cookie，刷新后回到未登录状态，用原邮箱和密码登录被拒绝      |
| 每小时维护         | 删除前 [42400239860](https://github.com/juanchaopan/education/actions/runs/42400239860) 和删除后 [42400858219](https://github.com/juanchaopan/education/actions/runs/42400858219) 都成功；删除当场完成，维护打印 `Pending family deletions completed: 0, failed: 0` |

没有在 staging 上把删除前的会话 cookie 重放到 API；旧会话被拒绝由 #44 的数据库和浏览器测试覆盖。没有直接读取 Neon 数据库核对清单行，删除完成以页面结果和维护任务没有待处理删除为依据。

## 检查的边界

- 清单库的检查只比较主机。同一 Neon 项目的分支和计算端点主机不同，检查分不出来；清单库放在另一个 Neon 项目里，由 staging 文档的配置步骤保证。
- `STAGING_DATABASE_HOST` 必须是只服务应用库的直连主机。填成多个数据库共用的连接池主机时，同一主机上的其他数据库也能通过检查。
- staging 加固只处理 anon/authenticated 角色；staging 文档要求不启用 Neon 的 Data API。

旧 Supabase 项目 `telkaiyxprpetmqthyhn` 已不被任何流程使用，是否暂停或删除由维护者决定。
