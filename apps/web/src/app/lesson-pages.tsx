import { gardenBalance } from '../features/learning/lessons/garden-balance/script';
import type { ProblemPages } from '../features/library/pages/ProblemPage';
import { problemPath } from '../shared/lib/problem-path';
import { GardenBalanceRoute } from './GardenBalanceRoute';

// Every maintained problem version and the page that teaches it, by problemPath.
export const lessonPages: ProblemPages = new Map([
  [problemPath(gardenBalance.id, gardenBalance.version), () => <GardenBalanceRoute />],
]);
