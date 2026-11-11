import type { FastifyInstance } from 'fastify';
import { questionBodyLimit, QuestionRequest, QuestionResult } from '@education/contracts';
import type { TeacherQuestionService } from '../services/teacher-question.js';
import { registerChildAiRequest } from './child-ai-request.js';

export function registerTeacherQuestion(
  app: FastifyInstance,
  origin: string,
  question?: TeacherQuestionService,
) {
  registerChildAiRequest(
    app,
    origin,
    {
      resource: 'question',
      bodyLimit: questionBodyLimit,
      body: QuestionRequest,
      reply: QuestionResult,
    },
    question,
  );
}
