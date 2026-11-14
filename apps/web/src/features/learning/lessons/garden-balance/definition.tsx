import { gardenBalanceLesson } from '@education/problems/lessons/garden-balance';
import { SpriteUse } from '../../components/garden-balance/garden-art';
import { GardenDefs } from '../../components/garden-balance/garden-defs';
import { GardenScene } from '../../components/garden-balance/garden-scenes';
import type { MovableLook, movableProps } from '../../components/garden-balance/movable-props';
import { Ambience } from '../../components/lesson-stage/Ambience';
import type { LessonDefinition } from '../lesson-definition';
import { gardenBoard } from './garden-board';
import { gardenCameras, gardenPalette, gardenStaging, gardenTeacher } from './garden-look';
import { gardenProps } from './garden-props';
import { gardenRecording } from './garden-record';
import {
  arrive,
  opening,
  respond,
  savesProgress,
  type GardenState,
  type Move,
} from './garden-story';
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

type Piece = keyof typeof movableProps;

// 菜园天平：一棵青菜和几根黄瓜一样重。The rabbit halves the scale, weighs one
// apple against cucumbers and swaps each apple for its cucumbers, then asks
// for the count; a variation with two cucumbers to an apple follows. It plays
// on the library's morning garden, which its content names, with the scale
// on its round workbench, and keeps what each scene finds on the conclusion
// board.
export const gardenLesson = {
  content: gardenBalanceLesson,
  title: '一棵青菜有多重？',
  theater: '菜园小剧场',
  labels: { film: '菜园天平互动短片', world: '可互动的菜园道具' },
  teacher: gardenTeacher,
  staging: gardenStaging,
  palette: gardenPalette,
  defs: <GardenDefs />,
  ambience: <Ambience kind="fireflies" />,
  script: { lines, shots, entryLines, cameras: gardenCameras },
  story: { opening, arrive, respond, savesProgress },
  record: gardenRecording,
  props: {
    ...gardenProps,
    carried: ({ sprite, size }) => <SpriteUse sprite={sprite} size={size} />,
  },
  answer: {
    question: answerQuestion,
    words: answerWords,
    choices: answerChoices,
    hints: answerHints,
  },
  board: gardenBoard,
  Scene: GardenScene,
} satisfies LessonDefinition<GardenState, Shot, LineId, Move, Piece, MovableLook>;
