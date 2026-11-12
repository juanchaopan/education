import type { QuestionRequest, QuestionResult } from '@education/contracts';
import type { ProblemPlugin } from '@education/problems/server';
import { questionReplyFor, type ModelQuestionReply } from '../domain/question-reply.js';
import { authoredRuling, authoredStep } from './authored-step.js';
import type { Credentials } from './metered-call.js';
import type { AskModel } from './model-task.js';
import type { QuestionModelInput } from './question-task.js';

type Problem = { id: string; version: number };
type QuestionProblem = Pick<ProblemPlugin, 'feedback' | 'checkStep'>;

// A question asked in a scene is answered in one sentence. Words the author's
// rules settle, such as a conclusion said out loud in the closing scene, get the
// author's own sentence; everything else goes to the model. Nothing here
// records help, an attempt or progress: the page records help before asking.
export function createTeacherQuestionService(
  authenticate: (credentials: Credentials) => Promise<void>,
  find: (id: string, version: number) => QuestionProblem | undefined,
  askModel: AskModel<QuestionModelInput, ModelQuestionReply>,
) {
  return async (
    credentials: Credentials,
    problem: Problem,
    { stepId, text }: QuestionRequest,
    signal?: AbortSignal,
  ): Promise<QuestionResult> => {
    await authenticate(credentials);
    const { plugin, step } = authoredStep(find(problem.id, problem.version), stepId);
    const ruled = await authoredRuling(plugin, { stepId, area: step.area, drawn: false }, text);
    if (ruled) return { status: 'ready', source: 'rules', reply: ruled.instruction };

    const reply = await askModel(credentials, { step: step.prompt, question: text }, signal);
    if (reply.status === 'fallback') return reply;
    return { status: 'ready', source: 'ai', reply: questionReplyFor(reply.value) };
  };
}

export type TeacherQuestionService = ReturnType<typeof createTeacherQuestionService>;
