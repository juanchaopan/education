import { Type, type Static } from '@sinclair/typebox';
import { AiHelpFallbackSchema } from './ai-help.js';
import {
  feedbackInstructionMaxLength,
  feedbackTextMaxLength,
  StepId,
} from './teaching-feedback.js';

const closed = { additionalProperties: false };

// A question is the words the child read over after speaking, in the scene it
// was asked in. The body is small: the text at its longest, every character
// escaped, and the step's name.
export const questionBodyLimit = 4 * 1024;

export const QuestionRequest = Type.Object(
  {
    stepId: StepId,
    text: Type.String({ minLength: 1, maxLength: feedbackTextMaxLength }),
  },
  closed,
);

// The teacher's answer is one sentence for the child. It judges nothing and
// points at nothing on screen; `source` says whether the author's rules or the
// model wrote it.
export const QuestionResult = Type.Union([
  Type.Object(
    {
      status: Type.Literal('ready'),
      source: Type.Union([Type.Literal('rules'), Type.Literal('ai')]),
      reply: Type.String({ minLength: 1, maxLength: feedbackInstructionMaxLength }),
    },
    closed,
  ),
  Type.Object({ status: Type.Literal('fallback'), reason: AiHelpFallbackSchema }, closed),
]);

export type QuestionRequest = Static<typeof QuestionRequest>;
export type QuestionResult = Static<typeof QuestionResult>;
