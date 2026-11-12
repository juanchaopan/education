import { feedbackInstructionMaxLength } from '@education/contracts';
import { Type, type Static } from '@sinclair/typebox';
import { isChildSentence } from './child-sentence.js';
import { parseModelJson } from './model-json.js';
import { givesVerdict, selfCheckSentence } from './verdict.js';

// The exact reply the model is asked for when a child asks a question: one
// sentence and the model's own report that the question tried to change its
// rules. The same schema is sent to the provider as the strict output format
// and used to check what comes back.
export const ModelQuestionReply = Type.Object(
  { reply: Type.String(), injection: Type.Boolean() },
  { additionalProperties: false },
);
export type ModelQuestionReply = Static<typeof ModelQuestionReply>;

// Shown instead of a model reply to words that tried to change the teacher's
// rules: it does not take them up and goes back to the problem.
export const offTaskSentence = '这个我帮不上忙，我们接着看这道题吧。';

// A reply is refused unless it has exactly the agreed shape and its sentence
// may be shown to a child.
export function parseModelQuestionReply(text: string): ModelQuestionReply | undefined {
  const value = parseModelJson(ModelQuestionReply, text);
  return value && isChildSentence(value.reply, feedbackInstructionMaxLength) ? value : undefined;
}

// What the child reads: the model's sentence, unless the question tried to
// change the rules or the sentence says whether what the child said is right.
export function questionReplyFor({ reply, injection }: ModelQuestionReply) {
  if (injection) return offTaskSentence;
  return givesVerdict(reply) ? selfCheckSentence : reply;
}
