# #45 备份恢复并防止已删除家庭复活

状态：实现和本地演练完成；staging 上的备份与恢复演练在合并、配置密钥之后进行，结果补在本页。做法见 [备份与恢复](../../deployment/backup.md)，目标见 [ADR-0005](../../adr/0005-data-consistency.md)。

## 实现

- 服务开关：应用库新表 `service_gate`，有一行时开放。迁移建库时写入；备份不带这一行。就绪检查要求当前版本的迁移已完成并且开关打开；配置了数据库时，开关关闭的时候所有 `/api` 请求返回 503“网站正在维护，请稍后再试。”。
- 恢复后的清理（`apps/api/src/restore-application.ts`）：按整份删除清单在一个事务里删除家庭，清除过期草稿；打开前再读一遍清单，库里还有清单里的家庭或过期草稿时不打开。
- 删除清单的销毁：每小时维护在完成待处理删除后，删去完成已超过 15 天的条目（备份最多保留 14 天）。
- 每日备份（`scripts/staging-backup.mjs`、`staging-backup.yml`）：在一个导出快照里读行数并 `pg_dump`，清单记下环境、时间、SHA-256 和行数，用 age 加密成 artifact，保留 14 天。开关关闭时不备份。
- 恢复（`scripts/staging-restore.mjs`、`staging-restore.yml`）：先核对环境、校验和、备份时间，再关闭开关、替换 schema 并载入 dump、核对行数、重放清单、迁移、检查后打开；每一步计时。
- 每小时维护、备份和恢复在同一个并发组里。

## 自动化测试

| 命令                                                      | 覆盖                                                                                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test -w @education/api`（`app.test.ts`）             | 开关关闭或就绪检查出错时 API 返回 503 和维护提示，`/health/live`、`/version.json` 照常；打开后恢复                                                                       |
| `npm run test:db`（`restore.integration.ts`）             | 旧备份里已删除的家庭及其会话和草稿被清掉，其他家庭保留；清单连不上时保持关闭；重放之后新记入清单的家庭让打开失败；只删去超过期限且已完成的清单条目；行数统计不含服务开关 |
| `npm run test:staging`（`staging-backup.test.mjs`）       | 拒绝其他环境、校验和不符、超过 14 天或时间在未来的备份；列出行数不一致的表；客户端工具不在参数里带密码并使用 verify-full；artifact 保留天数等于可恢复期限                |
| `npm run test:accounts`（`infra/tests/accounts.spec.ts`） | 双实例下关闭开关后两个实例都返回维护提示，打开后恢复；迁移失败时注册返回维护提示                                                                                         |

## 本地演练（2026-11-07）

在 Docker 里用 PostgreSQL 17.11 开启 TLS，应用库和清单库用两个主机名，按 staging 的托管规则（`sslmode=verify-full`、自签 CA、`STAGING_DATABASE_HOST`）运行真实的 `staging-backup.mjs`、age 加解密和 `staging-restore.mjs`，客户端为 pg_dump/pg_restore 17.11、age 1.1.1。

| 步骤                                         | 结果                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 备份两个家庭 K、D                            | `Backup taken …: 18 rows`                                                                               |
| 备份后删除 D（写入清单并删除）、新注册家庭 N | —                                                                                                       |
| 用错误的清单密码恢复                         | `Staging restore failed, the service stays closed`；开关为空，库里是备份内容                            |
| 把清单改成 production 后恢复                 | `Staging restore failed, nothing was changed: Backup belongs to production, not staging`                |
| 正常恢复                                     | 开关打开；K 在，D 不在，N 不在（备份之后的数据按 RPO 丢失）；迁移记录 14 条                             |
| 恢复耗时                                     | close 81 ms、clear 31 ms、load 188 ms、rows 51 ms、replay 32 ms、migrate 7211 ms、open 26 ms，共 7.6 秒 |
| 恢复后的库再备份                             | 成功                                                                                                    |
| 关闭开关后备份                               | `Staging backup failed: The service is closed; no backup taken`                                         |

本地演练不包括 GitHub artifact 的上传下载、Neon 的连接和真实 RTO。

## 尚未验证

- staging 上的每日备份、artifact 下载、恢复和计时，以及恢复后已删除家庭不能登录、其他家庭可以登录。
- 生产库由 #52 创建，届时按同样方式接入。
- 草稿的数据世代和旧设备待提交请求的核对没有实现，见 ADR-0005 的“#45 的实现”。
- 备份失败的告警由 #50 接入。
