import { Type, type Static } from '@sinclair/typebox';

const Instruction = Type.String({ minLength: 1 });
const TeachingStep = Type.Object({
  id: Type.String({ minLength: 1 }),
  instruction: Instruction,
  retryInstruction: Instruction,
  hint: Instruction,
  example: Type.Optional(Instruction),
  demonstration: Instruction,
});

export const TeachingDefinition = Type.Object({
  steps: Type.Array(TeachingStep, { minItems: 1 }),
});

export type TeachingStep = Static<typeof TeachingStep>;
export type TeachingDefinition = Static<typeof TeachingDefinition>;

export type HelpEvent = {
  stepId: string;
  kind: 'repeat' | 'retry' | 'hint' | 'example' | 'demonstration';
};
