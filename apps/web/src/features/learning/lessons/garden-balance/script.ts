import type { CountWords } from '../../interaction/spoken-answer';
import balanced from './assets/balanced.mp3';
import bridge from './assets/bridge.mp3';
import bridgeDone from './assets/bridge-done.mp3';
import bridgeOne from './assets/bridge-one.mp3';
import bridgeTwo from './assets/bridge-two.mp3';
import change from './assets/change.mp3';
import changeDone from './assets/change-done.mp3';
import clue from './assets/clue.mp3';
import halve from './assets/halve.mp3';
import hello from './assets/hello.mp3';
import one from './assets/one.mp3';
import question from './assets/question.mp3';
import three from './assets/three.mp3';
import tip from './assets/tip.mp3';

// The problem version this lesson teaches, as the catalog lists it.
export const gardenBalance = { id: 'garden-balance', version: 1 } as const;

// The rabbit gardener who narrates the garden and answers questions in it.
export const teacher = '小兔';

// The rabbit's lines, each with its recorded narration. The text is shown as
// the caption while it plays and stays readable when the sound cannot play.
export const lines = {
  hello: { text: '咦？今天，菜园里有两棵青菜。', clip: hello },
  clue: { text: '看。两棵青菜，和六个苹果一样重。', clip: clue },
  question: { text: '可我只想称一棵。你能把一棵青菜，拖进旁边的篮子吗？', clip: question },
  tip: { text: '呀，苹果这边沉下去了。', clip: tip },
  halve: { text: '拿走几个苹果，看看秤什么时候能回到中间。', clip: halve },
  balanced: { text: '平了。现在，一棵青菜和三个苹果一样重。', clip: balanced },
  one: { text: '那一个苹果，能换几根黄瓜呢？碰一碰这个苹果。', clip: one },
  three: { text: '看，三根黄瓜。和一个苹果一样重。', clip: three },
  bridge: {
    text: '刚才一个苹果能换三根黄瓜。这里还剩三个苹果。先换其中一个，看看秤盘会不会动。',
    clip: bridge,
  },
  bridgeOne: {
    text: '一个苹果换成了一组黄瓜。天平没歪。剩下的苹果也能这样换吗？',
    clip: bridgeOne,
  },
  bridgeTwo: { text: '已经换了两组。先猜猜，最后一个苹果换掉以后，会有几组？', clip: bridgeTwo },
  bridgeDone: {
    text: '三个苹果，一个个换成了三组黄瓜。每换一次，秤都还是平的。看看一共有几根。',
    clip: bridgeDone,
  },
  change: {
    text: '现在换个条件。假如每个苹果只换两根，还是三个苹果。先猜一猜，等你想好，再点苹果看看。',
    clip: change,
  },
  changeDone: {
    text: '还是三组。只是每组变成了两根。说说看，什么没变，什么变了？',
    clip: changeDone,
  },
} as const;

export type LineId = keyof typeof lines;

// The scenes in teaching order. Each one is a step of the problem: its id is
// what a draft saves, what a question is asked about and what speech
// recognition is told to expect.
export const shots = [
  'leaves',
  'apples',
  'exchange',
  'bridge',
  'answer',
  'variation',
  'end',
] as const;
export type Shot = (typeof shots)[number];

// What the rabbit says on arriving at a scene, whether by playing on or by
// coming back to a saved one.
export const entryLines: Record<Shot, readonly LineId[]> = {
  leaves: ['hello', 'clue', 'question'],
  apples: ['tip', 'halve'],
  exchange: ['one'],
  bridge: ['bridge'],
  answer: ['bridgeDone'],
  variation: ['change'],
  end: ['changeDone'],
};

export const answerQuestion = '一棵青菜和几根黄瓜一样重？';
export const answerChoices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
// The authored hints, in the order a child who asks again receives them.
export const answerHints = ['one-cabbage', 'count-groups'] as const;

// What a wrong count most likely is, so the child sees what to look at again.
const mistakes: Readonly<Record<number, string>> = {
  3: '3 是一个苹果换的根数。右盘有三组黄瓜，再数数一共有几根。',
  6: '6 是一开始苹果的个数。现在右盘都是黄瓜了，数数有几根。',
};

// The count is said in cucumbers, 根.
export const answerWords: CountWords = {
  unit: '根',
  explain: (count) => mistakes[count] ?? `${count} 根还不对。一组一组地数数右盘的黄瓜，再告诉我。`,
};
