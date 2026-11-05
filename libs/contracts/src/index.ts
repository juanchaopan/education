import { Type, type Static } from '@sinclair/typebox';
export { ParentRegistration, RegistrationReceipt, passwordIssue } from './registration.js';

export const ProblemSummary = Type.Object({
  id: Type.String({ minLength: 1 }),
  version: Type.Integer({ minimum: 1 }),
  title: Type.String({ minLength: 1 }),
  grade: Type.String({ minLength: 1 }),
  subject: Type.String({ minLength: 1 }),
  category: Type.String({ minLength: 1 }),
  sequence: Type.Integer({ minimum: 0 }),
});

export const CatalogResponse = Type.Object({ problems: Type.Array(ProblemSummary) });
export type ProblemSummary = Static<typeof ProblemSummary>;
export type CatalogResponse = Static<typeof CatalogResponse>;

export type TeachingFeedback = {
  status: 'correct' | 'needs-work' | 'uncertain' | 'recognition-failed';
  instruction: string;
  stepId: string;
  highlight?: { x: number; y: number; width: number; height: number };
};

export { ParentLogin, ParentSession } from './session.js';
export * from './verification.js';

export * from './recovery.js';
