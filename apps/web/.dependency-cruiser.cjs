// 架构规则：页面（容器）和展示组件的分层、功能之间的隔离、题目之间的隔离和按需加载。说明见 .claude/rules/ 里本组件的规范。
// 由 scripts/arch-check.mjs 运行（npm run arch），违反任何一条，自检和 CI 都会失败。

// 一道题自己的文件夹：lessons/<题目>/ 和 components/<题目>/。components/lesson-stage/ 是所有题目共用的画面部件，不算题目。
const lessonFolder = '^src/features/learning/(?:lessons|components)/(?!lesson-stage/)';
const lessonFiles = `${lessonFolder}[^/]+/`;

// 题目包里网站可以读的部分：课堂内容的类型（lesson-content）、绘景库背景的画面描述（backdrops）和每道题的课堂内容（lessons/<题目>）。
const problemPackage = '(^|/)(@education|libs)/problems';
const lessonContents = `${problemPackage}/((dist|src)/)?lessons/`;
const lessonContent = `${problemPackage}/((dist|src)/)?(lesson-content|backdrops|lessons/[^/]+?)([.](js|ts|d[.]ts))?$`;

module.exports = {
  forbidden: [
    {
      name: 'presentational-no-data-access',
      comment:
        '展示组件只管显示：不依赖 data-access、页面和 app 层。需要的数据由页面通过 props 传进来。',
      severity: 'error',
      from: { path: '^src/(features/[^/]+/components|shared/ui)/' },
      to: {
        path: '^src/(features/[^/]+/(data-access|pages)|app)/',
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'presentational-no-data-libraries',
      comment: '展示组件不取数据、不访问全局状态。',
      severity: 'error',
      from: { path: '^src/(features/[^/]+/components|shared/ui)/' },
      to: { path: '@tanstack/react-query|axios|swr|zustand|@reduxjs/toolkit|react-redux|jotai' },
    },
    {
      name: 'data-access-no-ui',
      comment: 'data-access 不依赖界面。',
      severity: 'error',
      from: { path: '^src/features/[^/]+/data-access/' },
      to: { path: '^src/(features/[^/]+/(pages|components)|shared/ui)/' },
    },
    {
      name: 'features-isolated',
      comment: '功能之间不互相引用，几个功能共用的东西放进 shared/。',
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: { path: '^src/features/[^/]+/', pathNot: '^src/features/$1/' },
    },
    {
      name: 'lessons-isolated',
      comment:
        '一道题的文件不引用另一道题的文件。几道题都要用的东西放进公共部件（components/lesson-stage/、interaction/、lessons/lesson-definition.ts）。',
      severity: 'error',
      from: { path: `${lessonFolder}([^/]+)/` },
      to: { path: lessonFiles, pathNot: `${lessonFolder}$1/` },
    },
    {
      name: 'lessons-read-their-own-content',
      comment:
        '一道题只读自己的课堂内容（@education/problems/lessons/<同一道题>），不读另一道题的。',
      severity: 'error',
      from: { path: `${lessonFolder}([^/]+)/` },
      to: {
        path: lessonContents,
        pathNot: `${problemPackage}/((dist|src)/)?lessons/$1([.](js|ts|d[.]ts))?$`,
      },
    },
    {
      name: 'lessons-loaded-on-demand',
      comment:
        '题目的文件、它们的课堂内容和公共题目页只在孩子打开题目时加载：题目以外的代码只能用动态 import 引用它们，题库页因此不带题目的代码。',
      severity: 'error',
      from: { pathNot: lessonFiles },
      to: {
        path: `(${lessonFiles}|${lessonContents}|^src/features/learning/pages/LessonPage[.]tsx$)`,
        dependencyTypesNot: ['dynamic-import', 'type-only'],
      },
    },
    {
      name: 'no-problem-plugins-in-browser',
      comment:
        '题目插件里有判定规则、答案和提示的文字，只在服务器上运行，网站的代码不引用它们。网站只能读课堂内容（lesson-content、backdrops 和 lessons/<题目>），它们不含判定规则。测试可以读插件，用来检查题目定义和插件一致。',
      severity: 'error',
      from: {},
      to: { path: `${problemPackage}(/|$)`, pathNot: lessonContent },
    },
    {
      name: 'shared-independent',
      comment: 'shared 不依赖任何功能。',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/features/' },
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
    exclude: { path: '[.]test[.]tsx?$' },
    parser: 'swc',
  },
};
