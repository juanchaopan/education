// 架构规则：每道题的课堂内容（src/lessons/、src/lesson-content.ts 和绘景库背景的画面描述 src/backdrops.ts）网站也会加载，
// 所以只能引用课堂内容的类型、辅助函数和背景描述，不能引用题目插件、判定规则或别的包。
// 由 scripts/arch-check.mjs 运行（npm run arch），违反任何一条，自检和 CI 都会失败。
module.exports = {
  forbidden: [
    {
      name: 'lesson-content-has-no-rules',
      comment:
        '课堂内容在网站和服务端都会读：只能引用 src/lesson-content.ts 和 src/backdrops.ts。判定规则、答案和提示的文字留在题目插件里，只在服务器上运行。',
      severity: 'error',
      from: { path: '^src/(lessons/|lesson-content[.]ts$|backdrops[.]ts$)' },
      to: { pathNot: '^src/(lesson-content|backdrops)[.]ts$' },
    },
    {
      name: 'no-circular',
      comment: '不允许循环依赖。',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '[.]test[.]ts$' },
    tsConfig: { fileName: 'tsconfig.json' },
    parser: 'swc',
  },
};
