import { Type, type Static } from '@sinclair/typebox';

const closed = { additionalProperties: false };
const coordinate = Type.Number({ minimum: 0, maximum: 1 });
const point = Type.Object({ x: coordinate, y: coordinate }, closed);
const revision = Type.String({
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
});
const expected = Type.Union([revision, Type.Null()]);

export const draftBodyLimit = 256 * 1024;
export const DraftContent = Type.Object(
  {
    stepId: Type.String({ minLength: 1, maxLength: 100, pattern: '^[^\\u0000-\\u001f]+$' }),
    drawing: Type.Array(Type.Array(point, { minItems: 1, maxItems: 4096 }), { maxItems: 128 }),
  },
  closed,
);
export const DraftCommand = Type.Union([
  Type.Object({ action: Type.Literal('save'), revision: expected, content: DraftContent }, closed),
  Type.Object({ action: Type.Literal('discard'), revision: expected }, closed),
]);
export const SavedDraft = Type.Object(
  { revision, expiresAt: Type.String(), content: DraftContent },
  closed,
);
export const DraftResponse = Type.Object({ draft: Type.Union([SavedDraft, Type.Null()]) }, closed);

export type DraftContent = Static<typeof DraftContent>;
export type DraftCommand = Static<typeof DraftCommand>;
export type SavedDraft = Static<typeof SavedDraft>;
export type DraftResponse = Static<typeof DraftResponse>;
