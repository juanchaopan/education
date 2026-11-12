import {
  isProblemId,
  type FeedbackRegion,
  type ProblemSummary,
  type TeachingFeedback,
  type SubmitAnswer,
} from '@education/contracts';
import { indexBooks, type Book } from './books.js';

export type AnsweringPolicy = {
  hints?: Readonly<Record<string, string>>;
  // Completion checks run locally and synchronously, using authored rules.
  checkCompletion: (input: SubmitAnswer['input']) => 'correct' | 'incorrect' | 'uncertain';
};

// The only problem content a model may see for a step. `area` limits where a
// highlight may point; without it the whole drawing sheet is allowed.
// `vocabulary` lists the step's own words, such as 平均分 or 每份, that speech
// recognition is told to expect; it holds problem wording, never anything a child wrote.
export type FeedbackStep = {
  prompt: string;
  area?: FeedbackRegion;
  vocabulary?: readonly string[];
};

// What a problem says of itself: its id and version, its title, the id of
// the book it is filed in and its place in that book. Its grade, subject and
// category are the book's.
export type ProblemEntry = Pick<ProblemSummary, 'id' | 'version' | 'title' | 'sequence'> & {
  book: string;
};

export type ProblemPlugin = {
  summary: ProblemEntry;
  answering?: AnsweringPolicy;
  feedback?: Readonly<Record<string, FeedbackStep>>;
  // Authored rules run on the child's text before any model; they cannot read a
  // drawing. An 'uncertain' or 'recognition-failed' result leaves the step to the model.
  checkStep?: (input: {
    stepId: string;
    answer: string;
  }) => TeachingFeedback | Promise<TeachingFeedback>;
};

// The problem as the catalogue lists it, filed under its book.
function listed({ id, version, title, sequence }: ProblemEntry, book: Book): ProblemSummary {
  return {
    id,
    version,
    title,
    sequence,
    grade: book.grade,
    subject: book.subject,
    category: book.category,
  };
}

export function createProblemRegistry(plugins: readonly ProblemPlugin[], shelf: readonly Book[]) {
  const booksById = indexBooks(shelf);
  const versions = new Map<string, ProblemPlugin>();
  const summaries = new Map<string, ProblemSummary>();
  const latest = new Map<string, ProblemSummary>();
  for (const plugin of plugins) {
    const { id, version, book: bookId } = plugin.summary;
    if (!isProblemId(id) || !Number.isSafeInteger(version) || version < 1) {
      throw new Error(`Invalid problem version: ${id}/${version}`);
    }
    const key = `${id}/${version}`;
    if (versions.has(key)) throw new Error(`Duplicate problem version: ${key}`);
    const book = booksById.get(bookId);
    if (!book) throw new Error(`Problem ${key} names an unknown book: ${bookId}`);
    const summary = listed(plugin.summary, book);
    versions.set(key, plugin);
    summaries.set(key, summary);
    const current = latest.get(id);
    if (!current || version > current.version) latest.set(id, summary);
  }
  return {
    current: [...latest.values()],
    books: shelf,
    find: (id: string, version: number) => versions.get(`${id}/${version}`),
    summary: (id: string, version: number) => summaries.get(`${id}/${version}`),
  };
}

export type ProblemRegistry = ReturnType<typeof createProblemRegistry>;
