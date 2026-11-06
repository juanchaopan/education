import { Type, type Static } from '@sinclair/typebox';

const problemIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const versionParamPattern = /^[1-9][0-9]*$/;
const maxIdLength = 100;
const ProblemId = Type.String({ pattern: problemIdPattern.source, maxLength: maxIdLength });
const ProblemVersion = Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER });

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

export const CatalogResponse = Type.Object({
  problems: Type.Array(ProblemSummary),
  categories: Type.Optional(Type.Array(CatalogCategory)),
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
export type CatalogResponse = Static<typeof CatalogResponse>;
export type ProblemParams = Static<typeof ProblemParams>;
