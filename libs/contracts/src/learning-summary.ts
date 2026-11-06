import { Type, type Static } from '@sinclair/typebox';
import { ProblemSummary } from './catalog.js';
import { ChildAccess } from './child-access.js';

const closed = { additionalProperties: false };
const count = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
export const learningSummaryPageSize = 20;
export const LearningSummaryParams = Type.Object({ childId: ChildAccess.properties.id }, closed);
export const LearningSummaryQuery = Type.Object(
  { offset: Type.Optional(Type.String({ pattern: '^(0|[1-9][0-9]{0,8})$' })) },
  closed,
);
export const ProblemLearningSummary = Type.Object(
  {
    id: ProblemSummary.properties.id,
    version: ProblemSummary.properties.version,
    title: Type.Union([ProblemSummary.properties.title, Type.Null()]),
    independent: count,
    assisted: count,
    incorrect: count,
    uncertain: count,
    hints: count,
    reviewSuggested: Type.Boolean(),
  },
  closed,
);
export const LearningSummary = Type.Object(
  {
    childId: ChildAccess.properties.id,
    problems: Type.Array(ProblemLearningSummary, { maxItems: learningSummaryPageSize }),
    hasMore: Type.Boolean(),
  },
  closed,
);
export type LearningSummaryParams = Static<typeof LearningSummaryParams>;
export type LearningSummaryQuery = Static<typeof LearningSummaryQuery>;
export type ProblemLearningSummary = Static<typeof ProblemLearningSummary>;
export type LearningSummary = Static<typeof LearningSummary>;
