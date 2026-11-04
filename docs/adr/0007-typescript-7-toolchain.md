# ADR-0007 TypeScript 7 工具链

- 状态：已接受（用户明确以 TS7 为目标）；实现待 PR 审查
- 日期：2026-11-04
- 相关决策：ADR-0003、ADR-0004

## 背景

用户要求目标版本为 TypeScript 7。typescript-eslint 8.72.1 与预发行 8.72.2-alpha.11 的 peer range 为 >=4.8.4 <6.1.0，直接升级的 PR #6 在 npm ci 时发生 ERESOLVE。工具兼容问题应通过调整工具解决，不能将 TS6 视为用户目标。dependency-cruiser 18.7.2 的 TypeScript compiler API 解析器也只支持 <7。

## 决策

所有工作区统一用 TypeScript 7.0.2 执行 tsc 编译、声明输出与严格类型检查。Node 运行时仍为 24，不因 TypeScript 升级而独立升级 Node 类型主版本。

使用项目原有 Oxlint 的新版本 1.91 替代 ESLint/typescript-eslint，根配置统一覆盖 API、前端、共享库、配置与脚本。迁移 ESLint recommended 与 TypeScript recommended 中已启用的规则，保留复杂度 10、深度 3、参数 5、普通函数 60 行、TSX 函数 100 行的限制，测试继续使用原有长度豁免。React Hooks 和组件导出规则仍有效；警告也阻止 lint 通过。

Oxlint 解析器自身拒绝重复参数与旧式八进制等无效严格模式语法；不配置不存在的 no-dupe-args、no-new-symbol、no-octal 规则。前两条在旧 TypeScript 配置中本就是 off。语法 lint 和 tsc 分工，不声称已运行基于类型的 no-floating-promises。

dependency-cruiser 使用内置 SWC 解析路径与 @swc/core，保留所有 forbidden 规则和 type-only 依赖信息。当前没有 tsconfig paths/baseUrl 别名；不再让 dependency-cruiser 通过旧 compiler API 读取 tsconfig。以后增加解析别名时，须同步配置和验证架构检查的解析选项。

删除旧 ESLint 配置与依赖，前端不保留第二套 lint 配置。编辑钩子、CLI 与 CI 使用同一根 Oxlint 配置。无需 force、legacy-peer-deps 或覆盖不兼容的 peer 版本。

## 验证

干净 npm ci、TS7 版本/依赖树、完整 check、浏览器功能检查与生产容器构建应通过。工具链回归检查使用临时隔离夹具，确认 any、复杂度、参数和长度超限失败；领域层反向 type-only 导入失败；展示组件 type-only 导入合法而运行时导入被拒绝。不能只靠“零模块/零错误”证明架构检查有效。

本变更不改应用行为、题目内容或数据模型。生产部署和大陆访问验证仍需实际托管环境。
