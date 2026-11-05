# #29 作答一致性与删除恢复探针

## 问题

PostgreSQL 事务、带版本草稿和独立删除清单能否在试点规模下避免进度重复累计、草稿静默覆盖和删除家庭从旧备份重新获得访问？

## 判据与时间盒

- 三轮并发提交，每轮观察两个重试连接真实等待同一笔事务。事务提交后，两个重试和一次丢弃响应后的再次请求均取得原回执，作答和进度仅各增加一次。相同请求键换内容须返回冲突。回滚不得留下作答或进度，随后重试成功。
- 两个会话使用同一个草稿版本同时保存，恰好一方成功，另一方收到新版本和冲突。提交后清除相应草稿，重试保留之后新建的草稿。
- 恢复用 `pg_dump` 创建的旧备份。应用角色连接在检查完成前被数据库拒绝。删除清单缺失、缺项或重放中断时保持关闭；完整清单可重复应用。开放后被删家庭、旧会话及到期草稿均不可读，未删家庭的会话、作答和有效草稿仍可读。
- 最多 45 分钟。使用合成数据，范围限于事务语义和本机恢复闸门。正式 API、存储供应商、真实凭据、生产级异地恢复与实际 RPO/RTO 由后续任务验证。

## 运行

从仓库根目录运行 `node spikes/answer-consistency-recovery/probe.mjs`，需要 Node.js 24 和本地 Docker 的 `postgres:17` 镜像。容器无网络、无宿主端口或卷。演练结束移除容器和临时数据。可用 `PROBE_PG_IMAGE` 指定其他本地 PostgreSQL 镜像，输出记录实际版本。

## 结果

2026-11-05，在 Windows Docker Desktop 上以合成数据通过。镜像摘要为 `sha256:748a18a54d3842d43bc156f0840d78029b8d349e0feca98c12b9c4ce3404a6b3`。丢失响应在客户端测试层模拟，数据库已实际提交。清单、原库和恢复库各自是独立数据库，共用同一个容器。

```text
environment node=v24.22.1 image=postgres:17 postgres=17.11 (Debian 17.11-1.pgdg13+2) isolation=read committed
attempt round=1 blocked=2 equal_retries=3 mismatched_payload=conflict attempts=1 progress=1
attempt round=2 blocked=2 equal_retries=3 mismatched_payload=conflict attempts=1 progress=1
attempt round=3 blocked=2 equal_retries=3 mismatched_payload=conflict attempts=1 progress=1
failed_transaction attempts=0 progress=0 retry_progress=1
draft blocked=1 saved=1 conflict=1 submit_cleared=true retry_preserved_new_draft=true
restore old_backup deleted_family=1 child=1 attempt=1 progress=1 private_draft=1 old_session=1 expired_draft=1
restore stage=before-replay app_connect=denied
restore stage=ledger-unavailable app_connect=denied
restore stage=ledger-incomplete app_connect=denied
restore stage=replay-rolled-back app_connect=denied
restore replay=1 ledger_entries=2 deleted_fixture_rows=0 expired_draft=0
restore replay=2 ledger_entries=2 deleted_fixture_rows=0 expired_draft=0
restore stage=verified-before-promotion app_connect=denied
restore promoted healthy_session=1 healthy_attempts=5 healthy_draft=1 old_session=0
PASS elapsed_seconds=66.96
```

建议采用事务、草稿版本和恢复闸门作为试点设计基线。总耗时包含容器启动、并发用例和本机演练，仅用于复现。清单的独立故障域、部署环境的登录与后台任务闸门，以及实际删除完成时限和 RPO/RTO 由 #44/#45 验证。参数和待决项见 [ADR-0005](../../docs/adr/0005-data-consistency.md)。
