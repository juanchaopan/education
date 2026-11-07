# #45 备份恢复并防止已删除家庭复活

状态：验收完成。staging 的每日加密备份、从 GitHub artifact 恢复、按删除清单清理和恢复期间关闭服务都已在真实 staging 上通过；失败恢复保持关闭由本地演练和自动化测试覆盖。做法见 [备份与恢复](../../deployment/backup.md)，目标见 [ADR-0005](../../adr/0005-data-consistency.md)。

## 实现

PR #115。

- 服务开关：应用库新表 `service_gate`，有一行时开放。建表的迁移写入这一行，之后的迁移不碰它；备份不带这一行。就绪检查要求当前版本的迁移已完成并且开关打开；配置了数据库时，开关关闭的时候所有 API 路由返回 503“网站正在维护，请稍后再试。”，按匹配到的路由判断，编码过的路径同样关闭。
- 恢复后的清理（`apps/api/src/restore-application.ts`）：在一个事务里删除备份中还有、删除清单里记着的家庭，撤销所有会话，再清除过期草稿；打开前再读一遍清单，库里还有清单里的家庭时不打开。
- 删除清单的销毁：每小时维护在完成待处理删除后，删去完成已超过 15 天的条目（备份最多保留 14 天）。
- 每日备份（`scripts/staging-backup.mjs`、`staging-backup.yml`）：在一个导出快照里读行数并 `pg_dump`，清单记下环境、主机、时间、SHA-256 和行数，用 age 加密成 artifact，保留 14 天。开关关闭时不备份。
- 恢复（`scripts/staging-restore.mjs`、`staging-restore.yml`）：只采用本仓库 `main` 上定时或手动运行的成功备份；先核对环境、校验和、备份时间，再关闭开关、替换 schema 并载入 dump、核对载入的开关是关闭的和行数、迁移并确认、重放清单、再核对清单后打开；每一步计时。
- 发布、每小时维护、备份和恢复各自持有应用库上的同一把 advisory lock（`scripts/staging-database-lock.mjs`），依次运行。

## 自动化测试

| 命令                                                      | 覆盖                                                                                                                                                                                                     |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test -w @education/api`（`app.test.ts`）             | 开关关闭或就绪检查出错时 API 返回 503 和维护提示，`/%61pi/…` 这样编码过的路径同样返回 503，`/health/live`、`/version.json` 照常；打开后恢复                                                              |
| `npm run test:db`（`restore.integration.ts`）             | 旧备份里已删除的家庭及其会话和草稿被清掉，其他家庭保留但会话被撤销；清单连不上时保持关闭；重放之后新记入清单的家庭让打开失败；迁移检查不依赖开关；只删去超过期限且已完成的清单条目；行数统计不含服务开关 |
| `npm run test:staging`（`staging-backup.test.mjs`）       | 拒绝其他环境、校验和不符、超过 14 天或时间在未来的备份；列出行数不一致的表；客户端工具不在参数里带密码并使用 verify-full；artifact 保留天数等于可恢复期限                                                |
| `npm run test:accounts`（`infra/tests/accounts.spec.ts`） | 双实例下关闭开关后两个实例都返回维护提示，打开后恢复；迁移失败时注册返回维护提示                                                                                                                         |

PR #115 的 CI（含真实 PostgreSQL 的 `test:db`、浏览器测试和双实例账号测试）全部通过。

## staging 演练（2026-11-07）

维护者用 age 生成密钥，设置了 Repository variable `STAGING_BACKUP_RECIPIENT`（公钥）和 Repository secret `STAGING_BACKUP_IDENTITY`（私钥），私钥另存在密码管理器。staging 的 Neon 项目是 PostgreSQL 18，Repository variable `STAGING_POSTGRES_MAJOR` 设为 `18`。

用两个合成家长账号（加号地址的维护者邮箱）演练：K 只注册，D 注册并完成邮箱验证。

| 步骤           | 结果                                                                                                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 发布           | 合并后的 staging 发布成功，`/version.json` 为 `4e1f7c2`，`/health/ready` 200：迁移 0013 建表并打开了开关                                                                                                                                                                  |
| 第一次备份     | [42410263504](https://github.com/juanchaopan/education/actions/runs/42410263504) 失败：`pg_dump: error: aborting because of server version mismatch`。客户端 17 低于服务器 18，没有生成 artifact；设置 `STAGING_POSTGRES_MAJOR=18` 后重跑                                 |
| 备份           | [42410355084](https://github.com/juanchaopan/education/actions/runs/42410355084) 成功，`Backup taken at 2026-11-07T20:18:24.000Z: 111 rows`；artifact `staging-backup` 61 798 字节，2026-11-21 过期，整个运行 67 秒                                                       |
| 备份后删除 D   | 页面显示“家庭已删除”，之后 D 用原邮箱和密码登录被拒绝：“邮箱或密码不正确，或登录状态已失效。”                                                                                                                                                                             |
| 恢复           | [42410509265](https://github.com/juanchaopan/education/actions/runs/42410509265) 成功，自动选中上面那次备份。恢复步骤 close 1411 ms、clear 238 ms、load 37 316 ms、rows 1813 ms、migrate 11 607 ms、replay 1796 ms、open 598 ms，共 54.8 秒；重放清单 2 条，撤销会话 1 个 |
| RTO            | 从手动启动到运行结束 100 秒（安装工具 25 秒、下载和解密 3 秒、恢复 57 秒），远低于 4 小时目标                                                                                                                                                                             |
| 恢复期间的服务 | 每 2 秒请求 `/api/v1/problems`：20:20:18 到 20:21:07 之间 16 次都是 503，前后都是 200；`/health/ready` 恢复后为 200                                                                                                                                                       |
| 恢复后的登录   | D 仍被拒绝；K 用原邮箱和密码登录成功                                                                                                                                                                                                                                      |
| 编码路径       | Vercel 的路由规则不把 `/%61pi/v1/problems` 交给 API 函数：返回缓存的前端页面（`text/html`），POST 返回 405，碰不到数据库                                                                                                                                                  |
| RPO            | 备份时点 20:18:24，与恢复相隔约 1 分钟；每日备份的最大数据丢失为 24 小时加上 GitHub 定时任务的延迟                                                                                                                                                                        |

没有在 staging 上制造失败恢复：失败后保持关闭由本地演练和 `restore.integration.ts` 覆盖。没有直接读取 Neon 核对表的行数，载入后的行数与清单一致由恢复步骤 `rows` 检查，检查不一致时恢复失败。合成账号 K 留在 staging 上，没有删除。

## 本地演练（2026-11-07）

在 Docker 里用 PostgreSQL 17.11 开启 TLS，应用库和清单库用两个主机名，按 staging 的托管规则（`sslmode=verify-full`、自签 CA、`STAGING_DATABASE_HOST`）运行真实的 `staging-backup.mjs`、age 加解密和 `staging-restore.mjs`，客户端为 pg_dump/pg_restore 17.11、age 1.1.1。

| 步骤                                         | 结果                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 备份两个家庭 K、D                            | `Backup taken …: 18 rows`                                                                              |
| 备份后删除 D（写入清单并删除）、新注册家庭 N | —                                                                                                      |
| 用错误的清单密码恢复                         | `Staging restore failed, the service stays closed`；开关为空，库里是备份内容                           |
| 把清单改成 production 后恢复                 | `Staging restore failed, nothing was changed: Backup belongs to production, not staging`               |
| 正常恢复                                     | 开关打开；K 在，D 不在，N 不在（备份之后的数据按 RPO 丢失）；迁移记录 14 条                            |
| 恢复耗时                                     | close 24 ms、clear 31 ms、load 196 ms、rows 16 ms、migrate 7540 ms、replay 16 ms、open 5 ms，共 7.8 秒 |
| 恢复后的库再备份                             | 成功                                                                                                   |
| 关闭开关后备份                               | `Staging backup failed: The service is closed; no backup taken`                                        |
| 恢复进行中开始备份                           | 备份等待数据库锁约 9 秒，恢复打开开关后备份成功；恢复后家长会话为 0                                    |

## 尚未验证

- 生产库由 #52 创建，届时按同样方式接入。
- 草稿的数据世代和旧设备待提交请求的核对没有实现，见 ADR-0005 的“#45 的实现”。
- 备份失败的告警由 #50 接入。
