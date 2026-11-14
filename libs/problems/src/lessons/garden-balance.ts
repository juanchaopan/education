import { lessonContent } from '../lesson-content.js';

// 一年级试卷第 7 题：两棵青菜和六个苹果一样重，一个苹果和三根黄瓜一样重，
// 一棵青菜和几根黄瓜一样重？The rabbit halves the scale, weighs one apple
// against cucumbers and swaps each apple for its cucumbers, then asks for the
// count; a variation with two cucumbers to an apple follows. The scene
// prompts never state the final count.
export const gardenBalanceLesson = lessonContent({
  problem: { id: 'garden-balance', version: 1 },
  flow: 'scene-by-scene',
  vocabulary: ['青菜', '苹果', '黄瓜', '天平', '秤盘', '一样重', '一组', '每组', '几根'],
  shots: ['leaves', 'apples', 'exchange', 'bridge', 'answer', 'variation', 'end'],
  answerScene: 'answer',
  lines: {
    hello: { scene: 'leaves', text: '咦？今天，菜园里有两棵青菜。' },
    clue: { scene: 'leaves', text: '看。两棵青菜，和六个苹果一样重。' },
    question: {
      scene: 'leaves',
      text: '可我只想称一棵。你能把一棵青菜，拖进旁边的篮子吗？',
    },
    tip: { scene: 'apples', text: '呀，苹果这边沉下去了。' },
    halve: { scene: 'apples', text: '拿走几个苹果，看看秤什么时候能回到中间。' },
    balanced: { scene: 'apples', text: '平了。现在，一棵青菜和三个苹果一样重。' },
    one: { scene: 'exchange', text: '那一个苹果，能换几根黄瓜呢？碰一碰这个苹果。' },
    three: { scene: 'exchange', text: '看，三根黄瓜。和一个苹果一样重。' },
    bridge: {
      scene: 'bridge',
      text: '刚才一个苹果能换三根黄瓜。这里还剩三个苹果。先换其中一个，看看秤盘会不会动。',
    },
    bridgeOne: {
      scene: 'bridge',
      text: '一个苹果换成了一组黄瓜。天平没歪。剩下的苹果也能这样换吗？',
    },
    bridgeTwo: {
      scene: 'bridge',
      text: '已经换了两组。先猜猜，最后一个苹果换掉以后，会有几组？',
    },
    bridgeDone: {
      scene: 'answer',
      text: '三个苹果，一个个换成了三组黄瓜。每换一次，秤都还是平的。看看一共有几根。',
    },
    change: {
      scene: 'variation',
      text: '现在换个条件。假如每个苹果只换两根，还是三个苹果。先猜一猜，等你想好，再点苹果看看。',
    },
    changeDone: {
      scene: 'end',
      text: '还是三组。只是每组变成了两根。说说看，什么没变，什么变了？',
    },
  },
  scenes: {
    leaves: {
      prompt:
        '天平左盘有两棵青菜，右盘有六个苹果，天平是平的。孩子要把一棵青菜拖进旁边的篮子，看看只称一棵会怎样。',
      entry: ['hello', 'clue', 'question'],
    },
    apples: {
      prompt:
        '左盘只剩一棵青菜，右盘还有六个苹果，苹果这边沉下去了。孩子要一个个拿走苹果，直到天平回到中间，发现一棵青菜和几个苹果一样重。',
      entry: ['tip', 'halve'],
    },
    exchange: {
      prompt:
        '天平一边是一个苹果。孩子碰一碰苹果，看到另一边出现几根黄瓜时天平变平，发现一个苹果和几根黄瓜一样重。',
      entry: ['one'],
    },
    bridge: {
      prompt:
        '左盘是一棵青菜，右盘是和它一样重的三个苹果。孩子把苹果一个个换成和它一样重的一组黄瓜，每换一次天平都还是平的。',
      entry: ['bridge'],
    },
    answer: {
      prompt:
        '三个苹果都换成了黄瓜，右盘有三组黄瓜，每组三根，和一棵青菜一样重。孩子要说出一棵青菜和几根黄瓜一样重。',
      entry: ['bridgeDone'],
    },
    variation: {
      prompt:
        '换个条件：每个苹果只换两根黄瓜，还是三个苹果。孩子先猜一猜会有几组、一共几根，再点苹果看看。',
      entry: ['change'],
    },
    end: {
      prompt:
        '三个苹果换成了三组黄瓜，每组两根。孩子要说说什么没变（组数还是三组），什么变了（每组的根数）。',
      entry: ['changeDone'],
    },
  },
  // Each conclusion is found in one scene and needed in the scenes after it.
  // The opening's two cabbages and six apples are replaced by the first
  // conclusion and stay on the opening scale only. The swaps use the second,
  // and leave one cabbage weighing three groups, on which the count of nine
  // is written once the child has said it. The variation's two cucumbers to
  // an apple stand beside the three they change.
  conclusions: [
    {
      id: 'cabbage-apples',
      says: '1 棵青菜和 3 个苹果一样重',
      amounts: [
        [1, 'cabbage'],
        [3, 'apple'],
      ],
      from: 'apples',
      hints: ['one-cabbage'],
    },
    {
      id: 'apple-cucumbers',
      says: '1 个苹果和 3 根黄瓜一样重',
      amounts: [
        [1, 'apple'],
        [3, 'cucumber'],
      ],
      from: 'exchange',
      uses: ['bridge', 'end'],
      hints: ['count-groups'],
    },
    {
      id: 'apple-two-cucumbers',
      says: '假如 1 个苹果和 2 根黄瓜一样重',
      amounts: [
        [1, 'apple'],
        [2, 'cucumber'],
      ],
      from: 'variation',
      uses: ['variation', 'end'],
      supposed: true,
    },
    {
      id: 'cabbage-groups',
      says: '1 棵青菜和 3 组黄瓜一样重',
      amounts: [
        [1, 'cabbage'],
        [3, 'group'],
      ],
      from: 'answer',
      uses: ['answer'],
      hints: ['count-groups'],
      answer: { amount: [9, 'cucumber'], says: '1 棵青菜和 3 组黄瓜一样重，一共 9 根黄瓜' },
    },
  ],
});

// The garden problem's variation, 「假如 1 个苹果 = 2 根黄瓜」: what the child
// may tap as kept and as changed when saying the reason is not possible, by
// id, with the words the dew drops show. The site shows them and the server's
// rule judges the ids, so both read them from here.
export const gardenVariationChoices = {
  groups: '组数',
  'per-group': '每组根数',
} as const;

export type GardenVariationChoice = keyof typeof gardenVariationChoices;
