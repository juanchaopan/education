# ADR-0014 应用库和删除清单库统一使用 Neon Free

- 状态：已接受（维护者选择）；staging 切换由 [#111](https://github.com/juanchaopan/education/issues/111) 实施，生产库随 [#45](https://github.com/juanchaopan/education/issues/45)、[#52](https://github.com/juanchaopan/education/issues/52) 创建和验收
- 日期：2026-11-07
- 相关需求：REQ-007、REQ-009
- 关联：[ADR-0005](0005-data-consistency.md)、[ADR-0006](0006-delivery-environments.md)、[ADR-0008](0008-hosting-spike.md)

## 背景

[ADR-0005](0005-data-consistency.md) 和 #44 要求删除清单放在应用库之外的独立数据库里，不进入应用库的备份，恢复备份后才能用它清掉已删除的家庭。staging 应用库在 Supabase Free 项目 `telkaiyxprpetmqthyhn` 里；Supabase Free 每个账号最多 2 个免费项目，维护者账号已经用满，建不了清单库。

维护者要求：只使用免费套餐；staging 和生产的应用库、删除清单库共 4 个数据库放在同一个供应商。

## 决策

1. 4 个 PostgreSQL 数据库各用一个 Neon Free 项目，区域都选 AWS Asia Pacific (Singapore) `aws-ap-southeast-1`，和 Vercel 函数的 sin1 在同一地区。Neon 的项目建好后不能改区域。

   | 项目                          | 用途             | 何时创建       |
   | ----------------------------- | ---------------- | -------------- |
   | `education-staging`           | staging 应用库   | #111           |
   | `education-staging-ledger`    | staging 删除清单 | #111           |
   | `education-production`        | 生产应用库       | #52 准备发布时 |
   | `education-production-ledger` | 生产删除清单     | #52 准备发布时 |

2. 每个环境的应用库和清单库在不同的项目里。Neon 的恢复和分支按项目进行，恢复应用库项目不会带回清单库，满足 ADR-0005 的要求。
3. 应用连接 Neon 的直连地址，连接串只带 `?sslmode=verify-full`。不用主机名含 `-pooler` 的连接池地址：它是事务级连接池，不支持应用使用的会话级 advisory lock，现有配置检查会拒绝它。Neon 的证书由公共 CA 签发，证书变量留空，使用 Node.js 自带的根证书。
4. staging 发布和每小时维护按 Repository variable `STAGING_DATABASE_HOST` 确认目标库：连接串主机不一致时，在连接数据库之前失败。清单库的主机必须和应用库的不同。这一检查不针对某个供应商，生产库也在 Neon 时，防止 staging 流程在生产库上迁移或改权限。
5. staging 只有合成账号，切换时不迁移数据，在新库上运行迁移即可。Supabase 项目 `telkaiyxprpetmqthyhn` 是否暂停或删除由维护者决定，发布流程不处理。
6. Neon 自带的恢复窗口不能代替 #45 要求的独立备份。生产库的备份位置、保留期限、恢复演练和 RPO/RTO 仍由 #45 确定。

## Neon Free 的限制

来源快照日期 2026-11-07，开户或接入生产前重新核对。

| 项目     | 免费额度或行为                                                                     |
| -------- | ---------------------------------------------------------------------------------- |
| 项目数   | 每个账号 100 个；每个项目 10 个分支                                                |
| 计算     | 每个项目每月 100 CU 小时，自动扩展到最多 2 CU                                      |
| 存储     | 每个项目 1 GB，所有项目合计 20 GB                                                  |
| 出站流量 | 每个项目每月 5 GB                                                                  |
| 空闲     | 空闲 5 分钟后计算缩到零，免费套餐不能关闭；下一次查询时启动，官方称通常几百毫秒    |
| 额度用尽 | 计算或流量用完时项目暂停到下个计费周期；存储超限时不能写入。不自动升级到付费套餐。 |

## 后果

- 免费额度用尽时应用不可用，也不能保存进度。staging 的就绪检查失败会打开告警 issue，见 [运行日志与告警](../deployment/staging.md#运行日志与告警)。不配置保活流量来规避套餐规则。
- 空闲后第一次请求要等计算启动，会多一些延迟。发布前的就绪探测在 503 时会重试；大陆设备上的实际延迟由 #51 测量。
- 每小时维护会唤醒两个 staging 项目，告警探测每小时再唤醒应用库一次，另一次紧跟维护、不另外唤醒。按最小 0.25 CU、每次唤醒约 5–10 分钟估算，应用库每月约 46 CU 小时，清单库约 18 CU 小时，都在 100 CU 小时以内；这是估算，不是实测，用量在 Neon 控制台核对。
- 撤销 `anon`、`authenticated` 授权的 staging 加固在 Neon 上没有对应角色时不做任何事；启用 RLS 不影响作为表所有者的应用角色。
- Neon 分支可以给 PR 预览提供独立的空库，本决策不启用 PR 预览。

## 来源

- [Neon Pricing](https://neon.com/pricing)
- [Neon FAQ：Free plan limits and quotas](https://neon.com/faqs/free-plan-limits-and-quotas)
- [Neon plans](https://neon.com/docs/introduction/plans)
- [Neon regions](https://neon.com/docs/introduction/regions)
- [Neon scale to zero](https://neon.com/docs/introduction/scale-to-zero)
- [Connect to Neon securely](https://neon.com/docs/connect/connect-securely)
