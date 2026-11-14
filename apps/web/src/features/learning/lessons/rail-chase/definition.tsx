import { railChaseLesson } from '@education/problems/lessons/rail-chase';
import { RailDefs } from '../../components/rail-chase/rail-cars';
import { RailScene } from '../../components/rail-chase/RailScene';
import type { LessonDefinition } from '../lesson-definition';
import { answerChoices, answerHints, answerQuestion, answerWords } from './rail-answer';
import { railPalette, railProps, railStaging, railTeacher } from './rail-look';
import { railRecording } from './rail-record';
import { arrive, opening, respond, savesProgress, type Move, type RailState } from './rail-story';
import { entryLines, lines, shots, type LineId, type Shot } from './script';

// 数轴追及：两车的中点 M、N 什么时候相距 4 格。The owl brings the child back
// into the problem, the child pushes the cars through key seconds while the
// derivation grows on the derivation board to |10 − t| = 4 and its two
// cases, gives both times, checks them on the same tracks and drives a
// faster yellow car. It follows 列式求解 and plays on the library's railway
// workshop at blue hour, which its content names; what each scene finds
// stays in the picture, on the start strip and the derivation board, so it
// keeps no conclusion board.
export const railLesson = {
  content: railChaseLesson,
  title: '两车的中点什么时候相距四格？',
  theater: '轨道小剧场',
  labels: { film: '数轴追及互动短片', world: '可推动的两辆小车和轨道' },
  teacher: railTeacher,
  staging: railStaging,
  palette: railPalette,
  defs: <RailDefs />,
  script: { lines, shots, entryLines },
  story: { opening, arrive, respond, savesProgress },
  record: railRecording,
  props: { ...railProps, carried: () => null },
  answer: {
    question: answerQuestion,
    words: answerWords,
    choices: answerChoices,
    hints: answerHints,
  },
  Scene: RailScene,
} satisfies LessonDefinition<RailState, Shot, LineId, Move, never, object>;
