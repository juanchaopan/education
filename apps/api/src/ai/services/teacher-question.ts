import type { QuestionRequest, QuestionResult } from '@education/contracts';
import type { ProblemPlugin } from '@education/problems/server';
import { lessonMaterial } from '../domain/lesson-material.js';
import { questionReplyFor, type ModelQuestionReply } from '../domain/question-reply.js';
import { authoredRuling, authoredScene } from './authored-step.js';
import type { Credentials } from './metered-call.js';
import type { AskModel } from './model-task.js';
import type { QuestionModelInput } from './question-task.js';

type Problem = { id: string; version: number };
type QuestionProblem = Pick<ProblemPlugin, 'feedback' | 'lesson' | 'checkStep'>;

// A question asked in a scene is answered in one sentence. Only a step the
// author opened to AI help that is a scene of the problem's lesson takes
// questions. Words the author's rules settle, such as a conclusion said out
// loud in the closing scene, get the author's own sentence, held to the
// step's area; everything else goes to the model, which sees the lesson so
// far: the lesson's content up to this scene, told with the page's record of
// what the scenes looked like and what the child did. A scene after the one
// that asks for the final answer is told only to a child the server has seen
// answer the problem version right. A record that does not fit the lesson,
// or a scene the child has not reached that way, gets no reply from the
// model, and the page shows the scene's own guidance. Nothing here records
// help, an attempt or progress: the page records help before asking.
// `admit` confirms the child's session and tells whether they have answered
// the problem version right.
export function createTeacherQuestionService(
  admit: (credentials: Credentials, problem: Problem) => Promise<boolean>,
  find: (id: string, version: number) => QuestionProblem | undefined,
  askModel: AskModel<QuestionModelInput, ModelQuestionReply>,
) {
  return async (
    credentials: Credentials,
    problem: Problem,
    { stepId, text, record }: QuestionRequest,
    signal?: AbortSignal,
  ): Promise<QuestionResult> => {
    const answered = await admit(credentials, problem);
    const { plugin, step, lesson } = authoredScene(find(problem.id, problem.version), stepId);
    const material = lessonMaterial(lesson, stepId, record, answered);
    if (!material) return { status: 'fallback', reason: 'invalid-input' };
    const scope = { stepId, area: step.area, drawn: false };
    const ruled = await authoredRuling(plugin, scope, text);
    if (ruled) return { status: 'ready', source: 'rules', reply: ruled.instruction };

    const reply = await askModel(credentials, { lesson: material, question: text }, signal);
    if (reply.status === 'fallback') return reply;
    return { status: 'ready', source: 'ai', reply: questionReplyFor(reply.value) };
  };
}

export type TeacherQuestionService = ReturnType<typeof createTeacherQuestionService>;
