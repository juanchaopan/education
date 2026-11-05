import type { ReactNode } from 'react';
import type { ProblemSummary } from '@education/contracts';

export type ProblemPages = ReadonlyMap<string, (problem: ProblemSummary) => ReactNode>;

// Register each version by problemPath with a callback that returns its page element.
export const problemPages: ProblemPages = new Map();
