# 本机验证记录

- 日期：2026-11-04，Node 24.22.1 / TypeScript 7.0.2。
- `npm run bench --prefix spikes/account-security`：9 组、540 次正式 hash/verify；原始样本在 argon2.json。
- `node spikes/account-security/bench.mjs --confirm`：8 组、480 次正式操作；原始样本在 argon2-confirmation.json。
- 对两份 JSON 逐组重算 nearest-rank P95，核对每 operation 30 个样本、总计 1,020 个样本，通过。
- `npm run check --prefix spikes/account-security`：19/19，通过，完整 TAP 见 scenarios.tap；使用 `--test-isolation=none` 明确报告逐场景结果。
- `node_modules/.bin/tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2023 --types node spikes/account-security/types.ts`：通过，现用包类型名为 HashOptions，未使用旧 Options 类型名。
- `npx --no-install oxlint --deny-warnings spikes/account-security`：通过。
- `npx --no-install prettier --check spikes/account-security`：通过。
- `npx --no-install jscpd .`：0 clones。
- `git diff --check`：通过。

这里只是独立探针。没有修改根 workspace、正式应用/数据库/认证配置、GitHub workflow、Vercel 项目或云环境草稿。未运行正式应用全套 CI，未证明真实 PostgreSQL 并发、HTTP 安全、Vercel 构建/资源、冷启动或大陆设备性能。
