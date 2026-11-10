// 每一幕的讲解清单：题目作者为这一幕准备好的动画，模型只能从中挑一段或不挑。
// 作答那一幕（answer）只放不泄露答案的讲解：不数总根数，不把三组合成一个数。
export type Demo = { id: string; say: string };

export const menus: Record<string, readonly Demo[]> = {
  leaves: [
    { id: 'glow-cabbages', say: '圈出左盘的两棵青菜' },
    { id: 'glow-apples', say: '圈出右盘的六个苹果' },
    { id: 'point-level', say: '指着天平的横梁，说明两边一样重时天平是平的' },
    { id: 'show-drag-cabbage', say: '用手指虚影演示把一棵青菜从左盘拖进旁边的篮子' },
    { id: 'glow-basket', say: '圈出天平旁边的篮子' },
  ],
  apples: [
    { id: 'glow-low-side', say: '圈出沉下去的苹果那一边' },
    { id: 'replay-halve', say: '重播：左盘从两棵青菜变成一棵后，苹果那边沉下去' },
    { id: 'show-drag-apple', say: '用手指虚影演示把一个苹果拖进旁边的篮子' },
    { id: 'point-middle', say: '指着天平横梁，说明横梁回到水平就是两边一样重' },
  ],
  exchange: [
    { id: 'glow-apple', say: '圈出秤盘上的那一个苹果' },
    { id: 'show-tap-apple', say: '用手指虚影演示点一下苹果' },
    { id: 'glow-empty-pan', say: '圈出另一边空着的秤盘' },
    { id: 'point-tilt', say: '指着歪向苹果一边的横梁，说明另一边还没放东西' },
  ],
  bridge: [
    { id: 'replay-apple-cucumbers', say: '重播一个苹果和三根黄瓜一样重的那次称量' },
    { id: 'replay-cabbage-apples', say: '重播一棵青菜和三个苹果一样重的那次称量' },
    { id: 'glow-next-apple', say: '圈出下一个要换的苹果' },
    { id: 'show-tap-replace', say: '用手指虚影演示点苹果，把它换成一组黄瓜' },
    { id: 'point-still-level', say: '指着横梁，说明换完一组以后天平还是平的' },
  ],
  answer: [
    { id: 'glow-groups', say: '依次圈出右盘的每一组黄瓜，只圈不数' },
    { id: 'glow-one-group', say: '只圈出右盘其中一组黄瓜' },
    { id: 'replay-apple-cucumbers', say: '重播一个苹果和三根黄瓜一样重的那次称量' },
    { id: 'replay-cabbage-apples', say: '重播一棵青菜和三个苹果一样重的那次称量' },
    { id: 'point-level', say: '指着横梁，说明左边的青菜和右边的黄瓜一样重' },
  ],
  variation: [
    { id: 'glow-spare', say: '圈出旁边写着「一个苹果换两根」的篮子' },
    { id: 'glow-apples', say: '圈出天平上的三个苹果' },
    { id: 'replay-bridge', say: '重播刚才每个苹果换成三根黄瓜的过程' },
    { id: 'show-tap-replace', say: '用手指虚影演示点苹果，把它换成一组黄瓜' },
  ],
  end: [
    { id: 'glow-groups', say: '依次圈出右盘的每一组黄瓜' },
    { id: 'glow-one-group', say: '只圈出右盘其中一组黄瓜' },
    { id: 'compare-before', say: '把刚才每组三根的样子和现在每组两根并排放在一起' },
    { id: 'glow-spare', say: '圈出旁边写着「一个苹果换两根」的篮子' },
  ],
};
