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

## 执行结果（2026-11-04）

- 项目：`education-access-spike` / `prj_pVpgvnM9GoqNvxUAKN7FJmcThHDW`；账号工作区 `juanchaopan1`，API 确认套餐 `hobby`。
- 预览：[打开测试页](https://education-access-spike-ogpfo98vl-juanchaopan1.vercel.app/)，部署 `dpl_4HWHQJKv6nUYfwR6zfAP5nvVoL4G`。API 状态 `READY`，目标 `staging`，Node `24.x`，区域 `sin1`。
- 源码提交：`5eb6313`。上传 7 个明确列出的源文件及锁文件；没有上传 `dev.js`、本地测试文件、环境或令牌。
- 本地 HTTP 检查通过：HTML、CSS、JS、Fastify JSON、`Cache-Control: no-store` 和 POST 405。系统 Chromium 的 390×844 页面测试通过：24 次请求、20/20 正式样本成功；注入 503 后 3 次连续失败停止，失败不伪造分位延迟。格式、Oxlint 和重复检查通过。
- Playwright 配套浏览器下载被环境策略阻止，使用已安装的系统 Chromium 实际执行；未冒充配套浏览器版本测试。截图见 [本地移动布局](../../docs/adr/assets/0014-vercel-local-mobile.png)，不是线上或大陆截图。
- Vercel API 确认函数产物 READY，但部署文件列表未展示静态输出；已显式配置 `outputDirectory: public`。线上 HTML/CSS/JS 和 API 的 HTTP 响应仍待确认，不仅凭 READY 判断全部端点可用。
- 云环境仅允许 `api.vercel.com`，对预览主机的直接请求被代理 CONNECT 403 拒绝。没有大陆测试节点，未获得线上或大陆延迟数据。用户可从大陆设备打开链接点击“开始测试”并复制结果；若打不开，记录错误和网络类型，不推断原因。
- 首次上传省略目标被 Vercel 标记为独立测试项目的 production；正确的 REST API 预览目标名为 `staging`。该首次部署和中间预览均已删除（DELETE 200），只保留上述 staging 部署。后续部署须显式指定目标及项目配置。

## 自定义域名（2026-11-04，等待 DNS）

用户要求使用 `education-access-spike.hyp.app`，继续由 Vercel 托管。已将该域名添加到上述项目，`verified: false`；Vercel 查询显示 `hyp.app` 的权威 DNS 在 Cloudflare。当前主机解析为 Cloudflare 地址，尚无 Vercel CNAME；这不证明存在同名显式记录，也可能来自通配记录。

在 Cloudflare 的 `hyp.app` 区域添加以下记录：

| 类型  | 名称                     | 内容                                                                   | 代理                 |
| ----- | ------------------------ | ---------------------------------------------------------------------- | -------------------- |
| CNAME | `education-access-spike` | `90215d081f0623e0.vercel-dns-017.com`                                  | DNS only（灰色云朵） |
| TXT   | `_vercel`                | `vc-domain-verify=education-access-spike.hyp.app,edb66cce0df2d1eae0cc` | 不适用               |

以上 TXT 是公开的域名验证记录，不是 Vercel API 令牌。保留已有 `_vercel` TXT；若子域已有冲突的 A/AAAA/CNAME，仅替换该子域的冲突记录，不改其他主机或通配记录。没有 Cloudflare 管理凭据，本轮没有修改 DNS。

已尝试将域名直接指向现有 staging 部署，Vercel 返回 HTTP 400 `cert_missing`。DNS 生效后须重新验证项目域名，检查 TLS 签发，再执行部署 alias 绑定；添加项目域名本身不足以使该 staging URL 可访问。当前项目默认域名关联生产目标，因此必须保留显式 staging alias 步骤，不把它误接到已删除的首次部署。

当前 `https://education-access-spike.hyp.app/` 尚未确认为可用；原 staging URL 保留。自定义域名不会自动证明大陆可达，也不会改变环境的网络允许列表。后续需要分别完成 HTTPS 检查和大陆设备测试。
