import { lessonContent } from '../lesson-content.js';

// The template variation's reasons to tap when saying the reason is not
// possible, by id, with the words the drops show: how the pebbles go in,
// and how many there are. The site shows them and the plugin's rule judges
// the ids, so both read them from here.
export const templateVariationChoices = {
  'one-by-one': '一颗一颗地放',
  count: '石子的颗数',
} as const;

export type TemplateVariationChoice = keyof typeof templateVariationChoices;

// The content of the template lesson, copied to `lessons/<problem id>.ts`
// together with the lesson's plugin and folders; see the handbook's
// 从模板加一道题. Two pebbles go into the bowl one at a time, and the child
// counts them. The variation follows with three pebbles: the child guesses,
// puts them in, says why, and only then hears what it came to.
export const lessonTemplateLesson = lessonContent({
  problem: { id: 'lesson-template', version: 1 },
  flow: 'scene-by-scene',
  backdrop: 'forest-picnic-morning',
  vocabulary: ['小石子', '碗', '一颗', '几颗'],
  shots: ['look', 'count', 'guess', 'place', 'reason', 'reveal'],
  answerScene: 'count',
  variation: {
    guessScene: 'guess',
    reasonScene: 'reason',
    revealScene: 'reveal',
    result: 'three-in-bowl',
    keeps: [],
    choices: templateVariationChoices,
  },
  lines: {
    look: { scene: 'look', text: '桌上有两颗小石子。把它们一颗一颗放进碗里。' },
    ask: { scene: 'count', text: '碗里一共有几颗小石子？' },
    three: {
      scene: 'guess',
      text: '假如桌上有三颗小石子，都放进碗里，碗里一共有几颗？先猜一猜，说出来。',
    },
    place: { scene: 'place', text: '那就放放看。把小石子一颗一颗放进碗里。' },
    why: { scene: 'reason', text: '和你猜的一样吗？说说为什么。' },
    reveal: { scene: 'reveal', text: '还是一颗一颗地放，只是多了一颗，一共三颗。' },
  },
  scenes: {
    look: {
      prompt: '桌上有小石子，旁边有一个碗。孩子要把小石子一颗一颗放进碗里。',
      entry: ['look'],
    },
    count: {
      prompt: '小石子都放进了碗里。孩子要说出碗里一共有几颗小石子。',
      entry: ['ask'],
    },
    guess: {
      prompt: '换个条件：假如桌上有三颗小石子，碗是空的。孩子先猜一猜，都放进碗里以后碗里有几颗。',
      entry: ['three'],
    },
    place: {
      prompt: '桌上有三颗小石子。孩子把它们一颗一颗放进碗里。',
      entry: ['place'],
    },
    reason: {
      prompt: '小石子都放进了碗里。孩子说说和自己猜的一样不一样，为什么。',
      entry: ['why'],
    },
    reveal: {
      prompt: '孩子说清了理由。老师说出碗里一共有几颗小石子。',
      entry: ['reveal'],
    },
  },
  // The template keeps its conclusions in its own picture, so they draw no
  // amounts. The variation keeps nothing of the problem: it sets three
  // pebbles, and once revealed finds the bowl holding them all.
  conclusions: [
    {
      id: 'three-pebbles',
      says: '假如桌上有 3 颗小石子',
      from: 'guess',
      uses: ['guess', 'place', 'reason'],
      supposed: true,
    },
    {
      id: 'three-in-bowl',
      says: '那么碗里一共有 3 颗小石子',
      from: 'reveal',
      uses: ['reveal'],
    },
  ],
  // The places on screen and the things there, how the picture stands, and
  // the child's key actions, which the teacher is told about in words when
  // the child asks a question.
  recordWords: {
    places: { table: '桌上', bowl: '碗里' },
    things: { pebble: { name: '小石子', unit: '颗' } },
    states: {},
    actions: { 'pebble-to-bowl': '把一颗小石子放进碗里' },
  },
});
