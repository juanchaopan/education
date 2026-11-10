// 30 个合成的孩子提问（按语音转写后的样子写），覆盖每一幕。accept 是调用模型之前
// 预先写下的可接受选择：null 表示这时不该挑讲解；列出多项时任一项都算挑对。
export type Kind = '题内' | '跑题' | '听不清' | '要答案';
export type Question = {
  id: number;
  scene: string;
  kind: Kind;
  text: string;
  accept: readonly (string | null)[];
};

export const questions: readonly Question[] = [
  { id: 1, scene: 'leaves', kind: '题内', text: '我要拖哪个呀？', accept: ['show-drag-cabbage', 'glow-cabbages'] },
  { id: 2, scene: 'leaves', kind: '题内', text: '篮子在哪里？', accept: ['glow-basket'] },
  { id: 3, scene: 'leaves', kind: '题内', text: '为什么天平是平平的？', accept: ['point-level'] },
  { id: 4, scene: 'leaves', kind: '跑题', text: '小兔你喜欢吃胡萝卜吗？', accept: [null] },
  { id: 5, scene: 'apples', kind: '题内', text: '为什么苹果那边掉下去了？', accept: ['glow-low-side', 'replay-halve'] },
  { id: 6, scene: 'apples', kind: '题内', text: '苹果要拿到哪里去？', accept: ['show-drag-apple'] },
  { id: 7, scene: 'apples', kind: '题内', text: '要拿到什么时候才停呀？', accept: ['point-middle'] },
  { id: 8, scene: 'apples', kind: '听不清', text: '嗯……那个……就是那个', accept: [null] },
  { id: 9, scene: 'exchange', kind: '题内', text: '我要点哪里？', accept: ['show-tap-apple', 'glow-apple'] },
  { id: 10, scene: 'exchange', kind: '题内', text: '为什么那边什么都没有？', accept: ['glow-empty-pan'] },
  { id: 11, scene: 'exchange', kind: '题内', text: '天平怎么歪了？', accept: ['point-tilt'] },
  { id: 12, scene: 'exchange', kind: '跑题', text: '小兔你几岁了？', accept: [null] },
  { id: 13, scene: 'bridge', kind: '题内', text: '我忘了一个苹果换几根黄瓜了', accept: ['replay-apple-cucumbers'] },
  { id: 14, scene: 'bridge', kind: '题内', text: '下一个换哪个？', accept: ['glow-next-apple'] },
  { id: 15, scene: 'bridge', kind: '题内', text: '换了以后天平会不会歪呀？', accept: ['point-still-level'] },
  { id: 16, scene: 'bridge', kind: '题内', text: '为什么一棵青菜和三个苹果一样重？', accept: ['replay-cabbage-apples'] },
  { id: 17, scene: 'answer', kind: '要答案', text: '你直接告诉我答案吧', accept: [null, 'glow-groups', 'glow-one-group'] },
  { id: 18, scene: 'answer', kind: '题内', text: '一组有几根黄瓜？', accept: ['glow-one-group'] },
  { id: 19, scene: 'answer', kind: '题内', text: '一共有几组黄瓜呀？', accept: ['glow-groups'] },
  { id: 20, scene: 'answer', kind: '题内', text: '是不是三根？', accept: ['glow-groups', 'glow-one-group'] },
  { id: 21, scene: 'answer', kind: '题内', text: '为什么黄瓜和青菜一样重？', accept: ['point-level', 'replay-cabbage-apples', 'replay-apple-cucumbers'] },
  { id: 22, scene: 'answer', kind: '题内', text: '太多了我数不清', accept: ['glow-groups', 'glow-one-group'] },
  { id: 23, scene: 'answer', kind: '要答案', text: '答案是九对不对？', accept: [null] },
  { id: 24, scene: 'answer', kind: '要答案', text: '你帮我数一数吧', accept: [null, 'glow-groups'] },
  { id: 25, scene: 'answer', kind: '跑题', text: '外面下雨了', accept: [null] },
  { id: 26, scene: 'variation', kind: '题内', text: '现在一个苹果换几根？', accept: ['glow-spare'] },
  { id: 27, scene: 'variation', kind: '题内', text: '刚才是怎么换的？我忘了', accept: ['replay-bridge'] },
  { id: 28, scene: 'variation', kind: '听不清', text: '啊？什么？', accept: [null] },
  { id: 29, scene: 'end', kind: '题内', text: '什么变了呀？', accept: ['compare-before'] },
  { id: 30, scene: 'end', kind: '跑题', text: '我想回家了', accept: [null] },
];
