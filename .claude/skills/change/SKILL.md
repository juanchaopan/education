---
name: change
description: 运行教育项目的变更流程。附题目 PDF 时读完全部可读题，和维护者确认新的公共部件和每道题的讲法，再逐题做互动课并实录、自审、修复和复验；其他输入按常规变更分诊。
argument-hint: '[题目 PDF 附件或路径、issue 编号或变更说明]'
disable-model-invocation: true
---

# 教育项目变更

先检查本次请求的附件和参数 `$ARGUMENTS`。题目 PDF 可以是附件或可读取的文件路径。

- 有题目 PDF 时，执行仓库 `AGENTS.md` 中的 PDF 约定。读取并完整执行 `docs/design/interactive-lesson-authoring.md` 的出题方针、逐题交付的三个阶段、自查卡和复验要求：新的公共部件和每道题的讲法、部件先和维护者确认，再做这道题。以每题可操作的预览、连续有声实录、逐题时间戳审查和复验状态为交付物。
- 其他输入按常规变更分诊。读取 `CLAUDE.md`、相关规则、`REVIEW.md`、`docs/README.md`，以及受影响的 issue、需求、设计和代码。分别判断需求变更和设计冲击。小改动明确复现与验收，大改动先确认需求或设计，再安排迁移和拆分可独立验证的工作。按项目的 PR 与审查规则交接。
