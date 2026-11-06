import {
  isProblemId,
  type CatalogCategory,
  type ProblemSummary,
  type TeachingFeedback,
  type SubmitAnswer,
} from '@education/contracts';

export type AnsweringPolicy = {
  hints?: Readonly<Record<string, string>>;
  // Completion checks run locally and synchronously, using authored rules.
  checkCompletion: (input: SubmitAnswer['input']) => 'correct' | 'incorrect' | 'uncertain';
};

export type ProblemPlugin = {
  summary: ProblemSummary;
  answering?: AnsweringPolicy;
  checkStep?: (input: {
    stepId: string;
    answer: unknown;
  }) => TeachingFeedback | Promise<TeachingFeedback>;
};

export function createProblemRegistry(
  plugins: readonly ProblemPlugin[],
  categories: readonly CatalogCategory[] = [],
) {
  const versions = new Map<string, ProblemPlugin>();
  const latest = new Map<string, ProblemSummary>();
  for (const plugin of plugins) {
    const { id, version } = plugin.summary;
    if (!isProblemId(id) || !Number.isSafeInteger(version) || version < 1) {
      throw new Error(`Invalid problem version: ${id}/${version}`);
    }
    const key = `${id}/${version}`;
    if (versions.has(key)) throw new Error(`Duplicate problem version: ${key}`);
    versions.set(key, plugin);
    const current = latest.get(id);
    if (!current || version > current.version) latest.set(id, plugin.summary);
  }
  return {
    current: [...latest.values()],
    categories,
    find: (id: string, version: number) => versions.get(`${id}/${version}`),
  };
}

// Register maintained content here. Test fixtures supply their own registry.
export const problemRegistry = createProblemRegistry([]);
