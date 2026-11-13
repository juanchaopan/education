import { randomUUID } from 'node:crypto';
import { registerChildAccess } from './identity/routes/child-access.js';
import type { ChildAccessService } from './identity/services/child-access.js';
import { registerAiConsent } from './identity/routes/ai-consent.js';
import type { AiConsentService } from './identity/services/ai-consent.js';
import { registerFamilyExport } from './identity/routes/family-export.js';
import type { FamilyExportService } from './identity/services/family-export.js';
import { registerFamilyDeletion } from './identity/routes/family-deletion.js';
import type { FamilyDeletionService } from './identity/services/family-deletion.js';
import { registerFamilyTimeZone } from './identity/routes/family-time-zone.js';
import type { FamilyTimeZoneService } from './identity/services/family-time-zone.js';
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
import Fastify, {
  LogController,
  type FastifyInstance,
  type FastifyError,
  type FastifyRequest,
} from 'fastify';
import { Type } from '@sinclair/typebox';
import { registerCatalog, type ProblemOpening } from './catalog/routes/catalog.js';
import { registerParentRegistration } from './identity/routes/registration.js';
import type { RegistrationService } from './identity/services/registration.js';
import { RequestError } from './shared/request-error.js';
import { databaseErrorCode } from './shared/database-error.js';
import { noteError, noteRequest, registerRequestLog } from './shared/request-log.js';
import { registerDrafts } from './learning/routes/draft.js';
import type { DraftService } from './learning/services/draft.js';
import { registerAnswering } from './learning/routes/answer.js';
import type { AnswerService } from './learning/services/answer.js';
import { registerVariation } from './learning/routes/variation.js';
import type { VariationService } from './learning/services/variation.js';
import { registerLearningSummary } from './learning/routes/learning-summary.js';
import type { LearningSummaryService } from './learning/services/learning-summary.js';
import { registerFamilyOverview } from './learning/routes/family-overview.js';
import type { FamilyOverviewService } from './learning/services/family-overview.js';
import { registerStudyTime } from './learning/routes/study-time.js';
import type { StudyTimeService } from './learning/services/study-time.js';
import { registerBookshelf } from './learning/routes/bookshelf.js';
import type { BookshelfService } from './learning/services/bookshelf.js';
import { registerTeachingFeedback } from './ai/routes/teaching-feedback.js';
import type { TeachingFeedbackService } from './ai/services/teaching-feedback.js';
import { registerTeacherQuestion } from './ai/routes/teacher-question.js';
import type { TeacherQuestionService } from './ai/services/teacher-question.js';
import { registerTranscription } from './ai/routes/transcription.js';
import type { VoiceTranscriptionService } from './ai/services/voice-transcription.js';

const localOrigin = 'http://127.0.0.1:5173';
type Ready = () => Promise<boolean>;
type AppOptions = {
  childAccess?: ChildAccessService;
  aiConsent?: AiConsentService;
  familyExport?: FamilyExportService;
  familyDeletion?: FamilyDeletionService;
  familyTimeZone?: FamilyTimeZoneService;
  drafts?: DraftService;
  answering?: AnswerService;
  variation?: VariationService;
  learningSummary?: LearningSummaryService;
  familyOverview?: FamilyOverviewService;
  studyTime?: StudyTimeService;
  bookshelf?: BookshelfService;
  problemOpening?: ProblemOpening;
  teachingFeedback?: TeachingFeedbackService;
  teacherQuestion?: TeacherQuestionService;
  voiceTranscription?: VoiceTranscriptionService;
  childSessions?: ChildSessionService;
  childRegistration?: ChildRegistrationService;
  origin?: string;
  registration?: RegistrationService;
  sessions?: SessionService;
  verification?: VerificationService;
  recovery?: RecoveryService;
  registrationKeys?: RegistrationKeyService;
  reauthentication?: ReauthenticationService;
  ready?: Ready;
  revision?: string;
  // Where structured log lines go; standard output when not given.
  logStream?: { write(line: string): void };
};
export function buildApp(options: AppOptions = {}) {
  const app = Fastify({
    bodyLimit: 1_048_576,
    genReqId: () => randomUUID(),
    logController: new LogController({
      disableRequestLogging: true,
      requestIdLogLabel: 'requestId',
    }),
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
    logger: {
      ...(options.logStream && { stream: options.logStream }),
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
    },
  });
  registerRequestLog(app);
  app.get(
    '/health/live',
    { schema: { response: { 200: Type.Object({ status: Type.Literal('ok') }) } } },
    () => ({ status: 'ok' }),
  );
  app.get('/health/ready', async (request, reply) => {
    const ready = await isReady(request, options.ready);
    return reply
      .code(ready ? 200 : 503)
      .header('Cache-Control', 'no-store')
      .send({ status: ready ? 'ready' : 'unavailable' });
  });
  registerServiceGate(app, options.ready);
  registerCatalog(app, undefined, options.problemOpening);
  registerLearning(app, options);
  registerTeachingFeedback(app, options.origin ?? localOrigin, options.teachingFeedback);
  registerTeacherQuestion(app, options.origin ?? localOrigin, options.teacherQuestion);
  registerTranscription(app, options.origin ?? localOrigin, options.voiceTranscription);
  app.get('/version.json', (_request, reply) =>
    reply.header('Cache-Control', 'no-store').send({ revision: options.revision ?? null }),
  );
  registerIdentity(app, options);
  registerErrors(app);
  return app;
}

// Whether the database is ready, noting why not on the request. A database
// that answers can still be closed for maintenance: its migration is behind or
// its service gate is shut. A check that fails is a database failure, and only
// an allowlisted error code is kept. Without a configured check nothing is
// ready.
async function isReady(request: FastifyRequest, ready: Ready | undefined) {
  if (!ready) return false;
  try {
    if (await ready()) return true;
    noteRequest(request, { outcome: 'maintenance' });
  } catch (error) {
    noteRequest(request, { outcome: 'database', code: databaseErrorCode(error) ?? 'UNKNOWN' });
  }
  return false;
}

// With a database configured, the API answers only while the database is ready.
// A database being restored, or one whose restore was not checked, has a closed
// service gate, so no family can sign in or read anything from it. The gate
// goes by the route the request matched, not the raw URL, so an encoded path
// that the router decodes to an API route is gated too.
function registerServiceGate(app: FastifyInstance, ready: Ready | undefined) {
  if (!ready) return;
  app.addHook('onRequest', async (request, reply) => {
    if (!request.routeOptions.url?.startsWith('/api/') || (await isReady(request, ready))) return;
    return reply
      .code(503)
      .header('Cache-Control', 'no-store')
      .header('Retry-After', '300')
      .send({ message: '网站正在维护，请稍后再试。' });
  });
}

function httpErrorStatus(error: FastifyError) {
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500)
    return error.statusCode;
  return 503;
}

// The request log records each error's category; the reply carries only a
// message meant for families.
function registerErrors(app: FastifyInstance) {
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const invalid = error.validation !== undefined;
    const status = error instanceof RequestError ? error.statusCode : httpErrorStatus(error);
    if (!(error instanceof RequestError)) noteError(request, error, status);
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

function registerLearning(app: FastifyInstance, options: AppOptions) {
  const origin = options.origin ?? localOrigin;
  registerDrafts(app, origin, options.drafts);
  registerAnswering(app, origin, options.answering);
  registerVariation(app, origin, options.variation);
  registerLearningSummary(app, options.learningSummary);
  registerFamilyOverview(app, options.familyOverview);
  registerStudyTime(app, origin, options.studyTime);
  registerBookshelf(app, origin, options.bookshelf);
}

function registerIdentity(app: FastifyInstance, options: AppOptions) {
  const origin = options.origin ?? localOrigin;
  registerParentRegistration(app, origin, options.registration);
  registerChildRegistration(app, origin, options.childRegistration);
  registerChildSessions(app, origin, options.childSessions);
  registerChildAccess(app, origin, options.childAccess);
  registerAiConsent(app, origin, options.aiConsent);
  registerFamilyExport(app, origin, options.familyExport);
  registerFamilyDeletion(app, origin, options.familyDeletion);
  registerFamilyTimeZone(app, origin, options.familyTimeZone);
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
