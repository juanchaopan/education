# PR 自动合并

自动化只为本仓库内、目标为 main、非草稿的 PR 启用 GitHub 原生 squash auto-merge。
它不直接调用 merge、不添加 human-reviewed，也不运行 PR 中的代码。
低风险 PR 在检查通过后自动合并；中高风险仍需维护者审查当前提交并添加 human-reviewed。
生产部署仍为手动。

## 一次性 GitHub 设置

本聊天的 GitHub integration 修改仓库设置返回 403，需要仓库管理员在网页操作：

1. Settings → General → Pull Requests：启用 Allow squash merging 和 Allow auto-merge。
2. Settings → Branches：为 main 创建经典 branch protection rule，要求 PR 合并。
3. 启用 Require status checks to pass before merging，添加精确 job 名：
   ci、commit-lint、risk-gate。启用 Require branches to be up to date before merging。
4. 先合入添加本工作流的 PR；该工作流自身不会为自己启用 auto-merge。

工作流通过普通分支 API（GET /repos/{owner}/{repo}/branches/main）读取 protected 与
protection.required_status_checks.contexts，确认三个检查都受保护。该接口只需 contents:read，
包含在现有 contents:write 中；不读取需要管理权限的 branchProtectionRule，也不需要 PAT。
缺少保护、检查列表或 API 请求失败时，拒绝登记。仅 ruleset 的配置如果不返回这三个 context，
同样会拒绝登记，因此仍按上面步骤配置经典保护规则。

普通分支 API 不返回 strict（分支必须最新）设置；请保留上面的 up-to-date 选项。
工作流不修改保护规则；GitHub 在实际合并时执行已配置的更新、检查和审批要求。
如果无法启用 auto-merge，运行会显示具体权限错误；不要移除 required checks 或风险关卡。

修改本工作流的修复 PR 仍执行 main 上的旧版本，需要先由维护者审查并合并。
修复合入后，对已有 PR 运行下述 Run workflow；重新运行旧 run 可能仍使用旧版本。

## 已有 PR

合入工作流后，在 Actions → auto-merge → Run workflow，输入 PR 号。
新 PR 自动登记；草稿在 ready for review 后登记。
已登记的 PR 在检查或人工审查完成时由 GitHub 合并，无需再次点击 Merge。
失败的依赖升级仍需修复，例如不支持的 TypeScript 版本不能自动通过检查。

GitHub 首页的“某分支 had recent pushes”是分支活动提示，不代表缺少 PR。
feat/application-scaffold 的 PR 为 #1，已合并；遗留 CI 内容随后通过 #4 合入 main。
