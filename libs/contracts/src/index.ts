export { ParentRegistration, RegistrationReceipt, passwordIssue } from './registration.js';
export * from './catalog.js';
export * from './teaching.js';

export type TeachingFeedback = {
  status: 'correct' | 'needs-work' | 'uncertain' | 'recognition-failed';
  instruction: string;
  stepId: string;
  highlight?: { x: number; y: number; width: number; height: number };
};

export { ParentLogin, ParentSession } from './session.js';
export * from './verification.js';

export * from './recovery.js';

export * from './registration-key.js';

export * from './child-registration.js';
export * from './child-session.js';
export * from './child-access.js';
