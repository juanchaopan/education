import { books } from './books.js';
import { gardenBalance } from './garden-balance.js';
import { createProblemRegistry } from './plugin.js';
import { railChase } from './rail-chase.js';

export * from './books.js';
export * from './plugin.js';

// Register maintained content here. Test fixtures supply their own registry.
export const problemRegistry = createProblemRegistry([gardenBalance, railChase], books);
