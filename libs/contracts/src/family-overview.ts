import { Type, type Static } from '@sinclair/typebox';
import { ProblemSummary } from './catalog.js';
import { ChildAccess } from './child-access.js';

const closed = { additionalProperties: false };
const count = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });

// A child's whole record added up: the problems tried, counted once each
// whatever their versions, and the answers finished alone or after help.
export const LearningTotals = Type.Object(
  { problems: count, independent: count, assisted: count },
  closed,
);

// A problem the child answered wrongly and has not yet finished alone, as the
// learning summary marks it for review. Versions the catalogue no longer lists
// are left out, since there is nothing to show for them.
export const ReviewIdea = Type.Object(
  {
    id: ProblemSummary.properties.id,
    version: ProblemSummary.properties.version,
    title: ProblemSummary.properties.title,
    incorrect: count,
  },
  closed,
);

export const ChildOverview = Type.Object(
  {
    id: ChildAccess.properties.id,
    total: LearningTotals,
    review: Type.Array(ReviewIdea),
  },
  closed,
);

// What the parent overview shows of every child in the family, read at once.
export const FamilyOverview = Type.Object({ children: Type.Array(ChildOverview) }, closed);

export type LearningTotals = Static<typeof LearningTotals>;
export type ReviewIdea = Static<typeof ReviewIdea>;
export type ChildOverview = Static<typeof ChildOverview>;
export type FamilyOverview = Static<typeof FamilyOverview>;
