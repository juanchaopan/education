import { lessonTemplateLesson } from '@education/problems/lessons/lesson-template';
import { Pebble, TemplateScene } from '../../components/lesson-template/TemplateScene';
import type { LessonDefinition } from '../lesson-definition';
import { templatePalette, templateStaging, templateTeacher } from './look';
import { templateRecording } from './record';
import {
  answerChoices,
  answerHints,
  answerQuestion,
  answerWords,
  entryLines,
  lines,
  shots,
  type LineId,
  type Shot,
} from './script';
import {
  arrive,
  opening,
  pebbleLook,
  respond,
  savesProgress,
  templateProps,
  type Move,
  type TemplateState,
} from './story';

// 数一数小石子, the template for a new lesson: the child puts two pebbles in a
// bowl and says how many are in it. It follows 逐幕探究 and plays on the
// library's morning forest picnic, which its content names, with the
// squirrel. A new lesson copies this definition, its content in
// @education/problems and its folders, and is registered with one line in
// registry.ts.
export const templateLesson = {
  content: lessonTemplateLesson,
  title: '碗里有几颗小石子？',
  theater: '林间小剧场',
  labels: { film: '数小石子互动短片', world: '可互动的小石子和碗' },
  teacher: templateTeacher,
  staging: templateStaging,
  palette: templatePalette,
  script: { lines, shots, entryLines },
  story: { opening, arrive, respond, savesProgress },
  record: templateRecording,
  props: { ...templateProps, carried: ({ size }) => <Pebble size={size} /> },
  answer: {
    question: answerQuestion,
    words: answerWords,
    choices: answerChoices,
    hints: answerHints,
  },
  Scene: TemplateScene,
} satisfies LessonDefinition<TemplateState, Shot, LineId, Move, 'pebble', typeof pebbleLook>;
