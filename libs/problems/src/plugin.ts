import {
  isProblemId,
  type AnswerInput,
  type FeedbackRegion,
  type ProblemSummary,
  type TeachingFeedback,
  type VariationReason,
} from '@education/contracts';
import { indexBooks, type Book } from './books.js';
import type { AnyLessonContent } from './lesson-content.js';

// What an authored rule makes of one answer: right, wrong, or not understood,
// which is never counted as wrong.
export type Judgement = 'correct' | 'incorrect' | 'uncertain';

export type AnsweringPolicy = {
  hints?: Readonly<Record<string, string>>;
  // Completion checks run locally and synchronously, using authored rules.
  checkCompletion: (input: AnswerInput) => Judgement;
};

// The variation a scene-by-scene lesson ends with: its own one or two hints,
// the rule for the number the child guesses first, and the rule for the
// reason the child then gives, said or tapped. Only these authored rules
// judge; no model does.
export type VariationPolicy = {
  hints: Readonly<Record<string, string>>;
  checkGuess: (input: AnswerInput) => Judgement;
  checkReason: (reason: VariationReason) => Judgement;
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

// A problem version on the server: what it says of itself, how its final
// answer is judged, the steps a model may see when judging work, its lesson
// content, which questions to the teacher are answered from, and the rules
// its author wrote for the child's words in a step.
export type ProblemPlugin = {
  summary: ProblemEntry;
  answering?: AnsweringPolicy;
  variation?: VariationPolicy;
  feedback?: Readonly<Record<string, FeedbackStep>>;
  lesson?: AnyLessonContent;
  // Authored rules run on the child's text before any model; they cannot read a
  // drawing. An 'uncertain' or 'recognition-failed' result leaves the step to the model.
  checkStep?: (input: {
    stepId: string;
    answer: string;
  }) => TeachingFeedback | Promise<TeachingFeedback>;
};

// A registered problem version: its plugin, the summary the catalogue lists
// for it, and the id of its book.
type Registered = Readonly<{ plugin: ProblemPlugin; summary: ProblemSummary; book: string }>;

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

const bookOrder = (a: ProblemSummary, b: ProblemSummary) =>
  a.sequence - b.sequence || (a.id < b.id ? -1 : Number(a.id > b.id));

// The latest version of every problem, grouped by the book that version is
// filed in, each book's problems in its order.
function shelve(latest: Iterable<Registered>) {
  const byBook = new Map<string, ProblemSummary[]>();
  for (const { summary, book } of latest) {
    const problems = byBook.get(book) ?? [];
    problems.push(summary);
    byBook.set(book, problems);
  }
  for (const problems of byBook.values()) problems.sort(bookOrder);
  return byBook as ReadonlyMap<string, readonly ProblemSummary[]>;
}

export function createProblemRegistry(plugins: readonly ProblemPlugin[], shelf: readonly Book[]) {
  const booksById = indexBooks(shelf);
  const versions = new Map<string, Registered>();
  const latest = new Map<string, Registered>();
  for (const plugin of plugins) {
    const { id, version, book: bookId } = plugin.summary;
    if (!isProblemId(id) || !Number.isSafeInteger(version) || version < 1) {
      throw new Error(`Invalid problem version: ${id}/${version}`);
    }
    const key = `${id}/${version}`;
    if (versions.has(key)) throw new Error(`Duplicate problem version: ${key}`);
    const book = booksById.get(bookId);
    if (!book) throw new Error(`Problem ${key} names an unknown book: ${bookId}`);
    const registered = { plugin, summary: listed(plugin.summary, book), book: bookId };
    versions.set(key, registered);
    const current = latest.get(id);
    if (!current || version > current.summary.version) latest.set(id, registered);
  }
  const byBook = shelve(latest.values());
  const registered = (id: string, version: number) => versions.get(`${id}/${version}`);
  return {
    current: [...latest.values()].map(({ summary }) => summary),
    books: shelf,
    find: (id: string, version: number) => registered(id, version)?.plugin,
    summary: (id: string, version: number) => registered(id, version)?.summary,
    // The book a problem version is filed in.
    bookOf: (id: string, version: number) => {
      const bookId = registered(id, version)?.book;
      return bookId === undefined ? undefined : booksById.get(bookId);
    },
    // The latest version of every problem filed in the book, in the book's order.
    problemsOf: (bookId: string) => byBook.get(bookId) ?? [],
  };
}

export type ProblemRegistry = ReturnType<typeof createProblemRegistry>;
