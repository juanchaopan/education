import { Type, type Static } from '@sinclair/typebox';
import { AiHelpFallbackResult } from './ai-help.js';
import { identifierPattern } from './patterns.js';
import { ChildText, feedbackInstructionMaxLength, StepId } from './teaching-feedback.js';

const closed = { additionalProperties: false };

// The limits of a lesson record: the longest id of a place, thing, state or
// action the lesson declares; the most things one picture lists and the most
// states it has; the most of one thing at a place, and the most times one
// action is counted; the most earlier scenes a record keeps a picture of,
// and the most recent key actions it keeps.
export const recordIdMaxLength = 40;
export const pictureThingsMax = 12;
export const pictureStatesMax = 4;
export const recordCountMax = 99;
export const recordScenesMax = 16;
export const recordActionsMax = 30;

const RecordId = Type.String({ pattern: identifierPattern.source, maxLength: recordIdMaxLength });
const Count = (minimum: number) => Type.Integer({ minimum, maximum: recordCountMax });

// A scene's picture at one moment, told in ids the lesson's content declares:
// how many of each thing lie at each place, and how the picture stands, for
// example that the scale is level. It holds no words, so nothing the page
// sends here can read as an instruction to the teacher.
export const ScenePicture = Type.Object(
  {
    things: Type.Array(Type.Object({ place: RecordId, thing: RecordId, count: Count(0) }, closed), {
      maxItems: pictureThingsMax,
    }),
    states: Type.Array(RecordId, { maxItems: pictureStatesMax }),
  },
  closed,
);

// One of the child's key actions in a scene, and how many times in a row.
export const KeyAction = Type.Object({ stepId: StepId, action: RecordId, times: Count(1) }, closed);

// What happened in the lesson so far, as the page saw it since the child
// opened it: the picture of the scene asked about, the picture each earlier
// scene ended with, in teaching order, and the child's latest key actions.
export const LessonRecord = Type.Object(
  {
    now: ScenePicture,
    ended: Type.Array(Type.Object({ stepId: StepId, picture: ScenePicture }, closed), {
      maxItems: recordScenesMax,
    }),
    actions: Type.Array(KeyAction, { maxItems: recordActionsMax }),
  },
  closed,
);

// A question is the words the child read over after speaking, in the scene it
// was asked in, with the lesson's record up to then. The body holds the
// longest question, every character escaped, and the fullest record.
export const questionBodyLimit = 40 * 1024;

export const QuestionRequest = Type.Object(
  { stepId: StepId, text: ChildText, record: LessonRecord },
  closed,
);

// The teacher's answer is one sentence for the child that points at nothing on
// screen. `source` says who wrote it: the author's rules, which may say whether
// the child's words are right, or the model, which never does.
export const QuestionResult = Type.Union([
  Type.Object(
    {
      status: Type.Literal('ready'),
      source: Type.Union([Type.Literal('rules'), Type.Literal('ai')]),
      reply: Type.String({ minLength: 1, maxLength: feedbackInstructionMaxLength }),
    },
    closed,
  ),
  AiHelpFallbackResult,
]);

export type ScenePicture = Static<typeof ScenePicture>;
export type KeyAction = Static<typeof KeyAction>;
export type LessonRecord = Static<typeof LessonRecord>;
export type QuestionRequest = Static<typeof QuestionRequest>;
export type QuestionResult = Static<typeof QuestionResult>;
