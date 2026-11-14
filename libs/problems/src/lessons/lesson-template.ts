import { lessonContent } from '../lesson-content.js';

// The content of the template lesson, copied to `lessons/<problem id>.ts`
// together with the lesson's plugin and folders; see the handbook's
// 从模板加一道题. Two pebbles go into the bowl one at a time, and the child
// counts them.
export const lessonTemplateLesson = lessonContent({
  problem: { id: 'lesson-template', version: 1 },
  flow: 'scene-by-scene',
  vocabulary: ['小石子', '碗', '一颗', '几颗'],
  shots: ['look', 'count', 'after'],
  answerScene: 'count',
  lines: {
    look: { scene: 'look', text: '桌上有两颗小石子。把它们一颗一颗放进碗里。' },
    ask: { scene: 'count', text: '碗里一共有几颗小石子？' },
    bye: { scene: 'after', text: '数对了。换一种东西，也能这样一个一个地数。' },
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
    after: {
      prompt: '孩子数对了碗里的小石子。这一幕说说换一种东西也能一个一个地数。',
      entry: ['bye'],
    },
  },
  conclusions: [],
});
