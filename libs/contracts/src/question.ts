import { Type, type Static } from '@sinclair/typebox';
import { AiHelpFallbackResult } from './ai-help.js';
import { ChildText, feedbackInstructionMaxLength, StepId } from './teaching-feedback.js';

const closed = { additionalProperties: false };

// A question is the words the child read over after speaking, in the scene it
// was asked in. The body is small: the text at its longest, every character
// escaped, and the step's name.
export const questionBodyLimit = 4 * 1024;

export const QuestionRequest = Type.Object({ stepId: StepId, text: ChildText }, closed);

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

export type QuestionRequest = Static<typeof QuestionRequest>;
export type QuestionResult = Static<typeof QuestionResult>;
