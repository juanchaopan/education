import { lessonContent } from '../lesson-content.js';

// The garden variation's reasons to tap when saying the reason is not
// possible, by id, with the words the drops show: the number of groups and
// the cucumbers in each. The site shows them and the server's rule judges
// the ids, so both read them from here.
export const gardenVariationChoices = { groups: '组数', 'per-group': '每组根数' } as const;

export type GardenVariationChoice = keyof typeof gardenVariationChoices;

// 一年级试卷第 7 题：两棵青菜和六个苹果一样重，一个苹果和三根黄瓜一样重，
// 一棵青菜和几根黄瓜一样重？The rabbit says what is looked for, halves the
// scale, weighs one apple against cucumbers and swaps each apple for its
// cucumbers, then asks for the count. The variation follows with two
// cucumbers to an apple: the child guesses, swaps, says why, and only then
// hears what it came to. The scale is called 天平 everywhere the child hears
// or reads it, every scene's first line can be understood on its own, and
// no scene prompt states the final count, the variation's result or its
// reason.
export const gardenBalanceLesson = lessonContent({
  problem: { id: 'garden-balance', version: 1 },
  flow: 'scene-by-scene',
  backdrop: 'garden-morning',
  vocabulary: ['青菜', '苹果', '黄瓜', '天平', '一样重', '一组', '每组', '几根'],
  shots: ['leaves', 'apples', 'exchange', 'bridge', 'answer', 'guess', 'swap', 'reason', 'reveal'],
  answerScene: 'answer',
  variation: {
    guessScene: 'guess',
    reasonScene: 'reason',
    revealScene: 'reveal',
    result: 'cabbage-two-each',
    keeps: ['cabbage-apples'],
    choices: gardenVariationChoices,
  },
  lines: {
    hello: {
      scene: 'leaves',
      text: '咦？今天，菜园里有两棵青菜。我们要找一找：一棵青菜和几根黄瓜一样重？',
    },
    clue: { scene: 'leaves', text: '看天平。两棵青菜，和六个苹果一样重。' },
    question: {
      scene: 'leaves',
      text: '我们只想称一棵。你能把一棵青菜，拖进旁边的篮子吗？',
    },
    tip: { scene: 'apples', text: '天平左边只剩一棵青菜了，右边六个苹果沉下去了。' },
    halve: { scene: 'apples', text: '一个一个拿走苹果，看看天平什么时候平。' },
    balanced: {
      scene: 'apples',
      text: '平了！一棵青菜和三个苹果一样重。我们要找的是黄瓜，先看看一个苹果能换几根黄瓜。',
    },
    one: { scene: 'exchange', text: '一个苹果，和几根黄瓜一样重呢？碰一碰这个苹果。' },
    three: { scene: 'exchange', text: '看，三根黄瓜。和一个苹果一样重。' },
    bridge: {
      scene: 'bridge',
      text: '天平上，一棵青菜和三个苹果一样重。把苹果换成黄瓜，先点一个苹果，看看天平会不会歪。',
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
      text: '三个苹果都换成了黄瓜，一共三组，天平还是平的。一棵青菜和几根黄瓜一样重？',
    },
    change: {
      scene: 'guess',
      text: '假如每个苹果只换两根黄瓜，换完以后一棵青菜和几根黄瓜一样重？先猜一猜，说出来。',
    },
    swap: { scene: 'swap', text: '那就换换看。点一点苹果，一个一个换。' },
    why: { scene: 'reason', text: '和你猜的一样吗？说说为什么。' },
    reveal: { scene: 'reveal', text: '还是三组，只是每组从三根变成了两根，一共六根。' },
  },
  scenes: {
    leaves: {
      prompt:
        '要找一棵青菜和几根黄瓜一样重。天平左盘有两棵青菜，右盘有六个苹果，天平是平的。孩子要把一棵青菜拖进旁边的篮子，看看只称一棵会怎样。',
      entry: ['hello', 'clue', 'question'],
    },
    apples: {
      prompt:
        '左盘只剩一棵青菜，右盘还有六个苹果，苹果这边沉下去了。孩子要一个个拿走苹果，直到天平平了，发现一棵青菜和几个苹果一样重。',
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
    guess: {
      prompt:
        '换个条件：假如每个苹果只换两根黄瓜。左盘一棵青菜，右盘三个苹果，天平是平的；篮子里有两根黄瓜，写着「一个苹果换两根」。孩子先猜一猜，换完以后一棵青菜和几根黄瓜一样重，说出来。',
      entry: ['change'],
    },
    swap: {
      prompt:
        '还是假如每个苹果只换两根黄瓜。孩子把右盘的苹果一个一个换成黄瓜，每换一个，看看天平怎样。',
      entry: ['swap'],
    },
    reason: {
      prompt:
        '右盘的苹果都按每个两根换成了黄瓜，天平是平的。孩子说说换出来的和自己猜的一样不一样，为什么。',
      entry: ['why'],
    },
    reveal: {
      prompt: '孩子说清了理由。老师说出换完以后一棵青菜和几根黄瓜一样重。',
      entry: ['reveal'],
    },
  },
  // Each conclusion is found in one scene and needed in the scenes after it.
  // The opening's two cabbages and six apples are replaced by the first
  // conclusion and stay on the opening scale only. The swaps use the second,
  // and leave one cabbage weighing three groups. The board plans for that
  // line from the start: every amount counts single things, so the three
  // cucumbers one apple weighs are drawn one by one, and the three groups are
  // the same nine cucumbers in frames of three, as the swaps framed them on
  // the scale, never a picture of their own. Once the child has said nine,
  // only the sentence gains the count. The variation is another problem: it
  // keeps the cabbage that weighs three apples, sets two cucumbers to an
  // apple, and once revealed finds the cabbage weighing three frames of two.
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
      uses: ['bridge'],
      hints: ['count-groups'],
    },
    {
      id: 'cabbage-groups',
      says: '1 棵青菜和 3 组黄瓜一样重',
      amounts: [
        [1, 'cabbage'],
        [9, 'cucumber', { group: 3 }],
      ],
      from: 'answer',
      uses: ['answer'],
      hints: ['count-groups'],
      answer: { says: '1 棵青菜和 3 组黄瓜一样重，一共 9 根黄瓜' },
    },
    {
      id: 'apple-two-cucumbers',
      says: '假如 1 个苹果和 2 根黄瓜一样重',
      amounts: [
        [1, 'apple'],
        [2, 'cucumber'],
      ],
      from: 'guess',
      uses: ['guess', 'swap', 'reason'],
      supposed: true,
    },
    {
      id: 'cabbage-two-each',
      says: '那么 1 棵青菜和 3 组黄瓜一样重，一共 6 根黄瓜',
      amounts: [
        [1, 'cabbage'],
        [6, 'cucumber', { group: 2 }],
      ],
      from: 'reveal',
      uses: ['reveal'],
    },
  ],
  // One scale stands in the middle of every scene, with the basket at its
  // right; the variation's basket holds the two spare cucumbers and its sign.
  recordWords: {
    places: {
      'left-pan': '天平左盘（画面左边）',
      'right-pan': '天平右盘（画面右边）',
      basket: '天平右边的篮子',
    },
    things: {
      cabbage: { name: '青菜', unit: '棵' },
      apple: { name: '苹果', unit: '个' },
      cucumber: { name: '黄瓜', unit: '根' },
      'group-of-three': { name: '黄瓜，每组 3 根', unit: '组' },
      'group-of-two': { name: '黄瓜，每组 2 根', unit: '组' },
    },
    states: {
      level: '天平是平的',
      'apples-down': '苹果这边沉下去了',
      'two-each-sign': '篮子上写着「一个苹果换两根」',
    },
    actions: {
      'cabbage-to-basket': '把一棵青菜拖进篮子',
      'apple-to-basket': '从右盘拿走一个苹果放进篮子',
      'apple-tapped': '碰了碰苹果',
      'apple-swapped': '把一个苹果换成一组黄瓜',
    },
  },
});
