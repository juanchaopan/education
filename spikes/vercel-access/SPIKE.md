# Vercel 访问探针

关联 #14；用户已要求部署免费预览并测试 Vercel。此目录只保留在 `spike/14-hosting-mainland`，不合并正式应用。45 分钟执行时间盒，不计环境启动等待。

## 要回答的问题

Vercel Hobby 能否部署一个同源静态页面与 Node.js 24 / Fastify 5 接口，并从目标大陆设备成功加载？

成功分层记录：本地处理器与页面通过、托管构建 READY、真实 HTTPS 访问、真实大陆设备结果。每层独立，不能互相替代。地区和性能依据实际设备样本记录，不从代理拒绝推断服务不可达。

## 最小实现与边界

独立静态页面、CSS、JavaScript 和只读 `/api/ping`；Fastify 通过 `inject` 接入 Vercel Node 函数。不部署完整教育网站，不测 TS7 应用构建、账号、数据库、AI 或邮件；不存儿童数据，也不添加题库。正式项目仍保留 React / TS7 / Fastify / PostgreSQL 架构。

最多每次点击发 24 个只读请求，10 秒超时，连续失败 3 次停止，可手动取消。首次请求单列，预热 3 次，20 个正式样本报告成功数和成功延迟分布；样本有限，不当作 SLA。无第三方前端资源、分析或结果上传。应用不记录请求正文，托管平台可能有常规访问日志。

## 本地运行

在本目录执行 `npm ci --ignore-scripts`、`npm run dev`；本地端口 4179。GET `/`、`/styles.css`、`/app.js` 和 `/api/ping` 应成功，POST `/api/ping` 返回 405。

## 托管

单独创建 `education-access-spike` 项目，Hobby、Node.js 24、`sin1` 请求区域、无 Git 自动发布关联。只上传本目录的 `package.json`、锁文件、`vercel.json`、`public/`、`api/`，不上传仓库、环境变量或令牌。部署目标为 preview；若需匿名测试，仅对这个无数据测试项目配置公开预览。不得改变其他项目访问规则或升级套餐。

清理时删除这个临时项目和部署；证据保留在 ADR 资料，代码随探针分支归档。创建部署后补充精确 URL、ID、实际区域、检查结果与剩余限制。
