import { registerChildAccess } from './identity/routes/child-access.js';
import type { ChildAccessService } from './identity/services/child-access.js';
import { registerAiConsent } from './identity/routes/ai-consent.js';
import type { AiConsentService } from './identity/services/ai-consent.js';
import { registerChildRegistration } from './identity/routes/child-registration.js';
import { registerChildSessions } from './identity/routes/child-session.js';
import type { ChildSessionService } from './identity/services/child-session.js';
import type { ChildRegistrationService } from './identity/services/child-registration.js';
import {
  registerRegistrationKeys,
  registerReauthentication,
} from './identity/routes/registration-key.js';
import type { RegistrationKeyService } from './identity/services/registration-key.js';
import type { ReauthenticationService } from './identity/services/reauthentication.js';
import { registerRecovery } from './identity/routes/recovery.js';
import type { RecoveryService } from './identity/services/recovery.js';
import { registerVerification } from './identity/routes/verification.js';
import type { VerificationService } from './identity/services/verification.js';
import { registerParentSessions } from './identity/routes/session.js';
import type { SessionService } from './identity/services/session.js';
import Fastify, { LogController, type FastifyInstance, type FastifyError } from 'fastify';
import { Type } from '@sinclair/typebox';
import { registerCatalog } from './catalog/routes/catalog.js';
import { registerParentRegistration } from './identity/routes/registration.js';
import type { RegistrationService } from './identity/services/registration.js';
import { RequestError } from './shared/request-error.js';
import { readinessErrorCode } from './shared/readiness-error.js';
import { registerDrafts } from './learning/routes/draft.js';
import type { DraftService } from './learning/services/draft.js';
import { registerAnswering } from './learning/routes/answer.js';
import type { AnswerService } from './learning/services/answer.js';
import { registerLearningSummary } from './learning/routes/learning-summary.js';
import type { LearningSummaryService } from './learning/services/learning-summary.js';

import { registerPractice } from './learning/routes/practice.js';
import type { PracticeService } from './learning/services/practice.js';
import { registerTeachingFeedback } from './ai/routes/teaching-feedback.js';
import type { TeachingFeedbackService } from './ai/services/teaching-feedback.js';

const localOrigin = 'http://127.0.0.1:5173';
type AppOptions = {
  childAccess?: ChildAccessService;
  aiConsent?: AiConsentService;
  drafts?: DraftService;
  answering?: AnswerService;
  learningSummary?: LearningSummaryService;
  practice?: PracticeService;
  teachingFeedback?: TeachingFeedbackService;
  childSessions?: ChildSessionService;
  childRegistration?: ChildRegistrationService;
  origin?: string;
  registration?: RegistrationService;
  sessions?: SessionService;
  verification?: VerificationService;
  recovery?: RecoveryService;
  registrationKeys?: RegistrationKeyService;
  reauthentication?: ReauthenticationService;
  ready?: () => Promise<boolean>;
  revision?: string;
};
export function buildApp(options: AppOptions = {}) {
  const app = Fastify({
    bodyLimit: 1_048_576,
    logController: new LogController({ disableRequestLogging: true }),
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
    logger: {
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
    },
  });
  app.get(
    '/health/live',
    { schema: { response: { 200: Type.Object({ status: Type.Literal('ok') }) } } },
    () => ({ status: 'ok' }),
  );
  app.get('/health/ready', async (_request, reply) => {
    let ready = false;
    try {
      ready = (await options.ready?.()) === true;
    } catch (error) {
      app.log.warn({ code: readinessErrorCode(error) }, 'Database readiness unavailable');
    }
    return reply
      .code(ready ? 200 : 503)
      .header('Cache-Control', 'no-store')
      .send({ status: ready ? 'ready' : 'unavailable' });
  });
  registerCatalog(app);
  registerDrafts(app, options.origin ?? localOrigin, options.drafts);
  registerAnswering(app, options.origin ?? localOrigin, options.answering);
  registerLearningSummary(app, options.learningSummary);
  registerPractice(app, options.origin ?? localOrigin, options.practice);
  registerTeachingFeedback(app, options.origin ?? localOrigin, options.teachingFeedback);
  app.get('/version.json', (_request, reply) =>
    reply.header('Cache-Control', 'no-store').send({ revision: options.revision ?? null }),
  );
  registerIdentity(app, options);
  registerErrors(app);
  return app;
}

function httpErrorStatus(error: FastifyError) {
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500)
    return error.statusCode;
  return 503;
}

function registerErrors(app: FastifyInstance) {
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const invalid = error.validation !== undefined;
    const status = error instanceof RequestError ? error.statusCode : httpErrorStatus(error);
    request.log.error({ requestId: request.id, code: error.code }, 'Request failed');
    if (status === 429) reply.header('Retry-After', '60');
    void reply
      .code(status)
      .header('Cache-Control', 'no-store')
      .send({
        message:
          error instanceof RequestError
            ? error.message
            : invalid
              ? '请检查邮箱和密码格式后重试。'
              : '暂时无法完成，请稍后重试。',
      });
  });
}

function registerIdentity(app: FastifyInstance, options: AppOptions) {
  const origin = options.origin ?? localOrigin;
  registerParentRegistration(app, origin, options.registration);
  registerChildRegistration(app, origin, options.childRegistration);
  registerChildSessions(app, origin, options.childSessions);
  registerChildAccess(app, origin, options.childAccess);
  registerAiConsent(app, origin, options.aiConsent);
  registerParentSessions(app, origin, options.sessions);
  registerVerification(app, {
    origin: origin,
    sessions: options.sessions,
    verification: options.verification,
  });
  registerRecovery(app, origin, options.recovery);
  registerRegistrationKeys(app, origin, options.registrationKeys);
  registerReauthentication(app, origin, options.reauthentication);
}
