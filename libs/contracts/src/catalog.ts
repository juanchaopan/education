import { Type, type Static } from '@sinclair/typebox';

const problemIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const versionParamPattern = /^[1-9][0-9]*$/;
const maxIdLength = 100;
// Problem ids, and the book ids written the same way: lower-case letters and
// digits in words joined by single hyphens.
export const ProblemId = Type.String({ pattern: problemIdPattern.source, maxLength: maxIdLength });
export const ProblemVersion = Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER });

export const CatalogCategory = Type.Object({
  grade: Type.String({ minLength: 1 }),
  subject: Type.String({ minLength: 1 }),
  category: Type.String({ minLength: 1 }),
});

export const ProblemSummary = Type.Composite([
  CatalogCategory,
  Type.Object({
    id: ProblemId,
    version: ProblemVersion,
    title: Type.String({ minLength: 1 }),
    sequence: Type.Integer({ minimum: 0 }),
  }),
]);

// How a problem opens: a child practises it, keeping the work; a parent
// previews it, keeping nothing.
export const problemModes = ['practice', 'preview'] as const;
export const ProblemMode = Type.Union(problemModes.map((mode) => Type.Literal(mode)));

// A problem as it opens for the signed-in viewer, with the book it is filed in.
export const ProblemOpening = Type.Composite([
  ProblemSummary,
  Type.Object({ mode: ProblemMode, book: ProblemId }),
]);

// Why a problem that exists does not open for the viewer: its book is not
// given to the child, or the book is unavailable for now.
export const problemAccessReasons = ['unassigned', 'unavailable'] as const;
export const ProblemAccessReason = Type.Union(
  problemAccessReasons.map((reason) => Type.Literal(reason)),
);
export const ProblemAccessDenied = Type.Object({
  message: Type.String(),
  reason: ProblemAccessReason,
});

export const ProblemParams = Type.Object({
  id: ProblemId,
  version: Type.String({ pattern: versionParamPattern.source, maxLength: 16 }),
});

export function isProblemId(id: string) {
  return id.length <= maxIdLength && problemIdPattern.test(id);
}

export function parseProblemVersion(raw: string) {
  const version = Number(raw);
  return Number.isSafeInteger(version) && versionParamPattern.test(raw) ? version : undefined;
}

export type CatalogCategory = Static<typeof CatalogCategory>;
export type ProblemSummary = Static<typeof ProblemSummary>;
export type ProblemMode = Static<typeof ProblemMode>;
export type ProblemOpening = Static<typeof ProblemOpening>;
export type ProblemAccessReason = Static<typeof ProblemAccessReason>;
export type ProblemAccessDenied = Static<typeof ProblemAccessDenied>;
export type ProblemParams = Static<typeof ProblemParams>;
