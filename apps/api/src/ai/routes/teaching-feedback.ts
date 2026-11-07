import type { FastifyInstance } from 'fastify';
import { feedbackBodyLimit, FeedbackRequest, TeachingFeedbackResult } from '@education/contracts';
import type { TeachingFeedbackService } from '../services/teaching-feedback.js';
import { registerChildAiRequest } from './child-ai-request.js';

export function registerTeachingFeedback(
  app: FastifyInstance,
  origin: string,
  feedback?: TeachingFeedbackService,
) {
  registerChildAiRequest(
    app,
    origin,
    {
      resource: 'feedback',
      bodyLimit: feedbackBodyLimit,
      body: FeedbackRequest,
      reply: TeachingFeedbackResult,
    },
    feedback,
  );
}
