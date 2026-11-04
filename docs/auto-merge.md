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

工作流读取经典 main 分支保护；若只配置 ruleset，它会拒绝启用，而不是猜测是否安全。
如果 Actions token 无法读取分支保护或启用 auto-merge，运行会显示具体权限错误；
不要通过去掉 required checks 或风险关卡来解决权限问题。

## 已有 PR

合入工作流后，在 Actions → auto-merge → Run workflow，输入 PR 号。
新 PR 自动登记；草稿在 ready for review 后登记。
已登记的 PR 在检查或人工审查完成时由 GitHub 合并，无需再次点击 Merge。
失败的依赖升级仍需修复，例如不支持的 TypeScript 版本不能自动通过检查。

GitHub 首页的“某分支 had recent pushes”是分支活动提示，不代表缺少 PR。
feat/application-scaffold 的 PR 为 #1，已合并；遗留 CI 内容随后通过 #4 合入 main。
