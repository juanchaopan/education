import { Type, type Static } from '@sinclair/typebox';
import { ProblemSummary } from './catalog.js';
import { ChildAccess } from './child-access.js';

const closed = { additionalProperties: false };
export const practicePageSize = 20;
export const PracticeChild = Type.Object({ childId: ChildAccess.properties.id }, closed);
export const PracticeQuery = Type.Object(
  { offset: Type.Optional(Type.String({ pattern: '^(0|[1-9][0-9]{0,8})$' })) },
  closed,
);
const identity = { id: ProblemSummary.properties.id, version: ProblemSummary.properties.version };
export const AssignPractice = Type.Object(identity, closed);
export const PracticeItem = Type.Object(
  { ...identity, title: Type.Union([ProblemSummary.properties.title, Type.Null()]) },
  closed,
);
export const PracticePage = Type.Object(
  {
    problems: Type.Array(PracticeItem, { maxItems: practicePageSize }),
    hasMore: Type.Boolean(),
  },
  closed,
);
export type PracticeChild = Static<typeof PracticeChild>;
export type PracticeQuery = Static<typeof PracticeQuery>;
export type AssignPractice = Static<typeof AssignPractice>;
export type PracticeItem = Static<typeof PracticeItem>;
export type PracticePage = Static<typeof PracticePage>;
