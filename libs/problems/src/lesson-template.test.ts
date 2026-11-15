import { expect, it } from 'vitest';
import { lessonTemplate, lessonTemplateBook } from './lesson-template.js';
import { createProblemRegistry } from './plugin.js';
import { problemRegistry } from './server.js';

const { answering, variation } = lessonTemplate;

it('is a valid plugin that a registry of its own accepts', () => {
  const registry = createProblemRegistry([lessonTemplate], [lessonTemplateBook]);
  expect(registry.find('lesson-template', 1)).toBe(lessonTemplate);
});

it('is in no catalog the server keeps, so no child sees it', () => {
  expect(problemRegistry.find('lesson-template', 1)).toBeUndefined();
  expect(problemRegistry.current.map(({ id }) => id)).not.toContain('lesson-template');
  expect(problemRegistry.books.map(({ id }) => id)).not.toContain(lessonTemplateBook.id);
});

it('judges the count of pebbles, and leaves anything but a whole number undecided', () => {
  const check = answering!.checkCompletion;
  expect([check(2), check(3), check(2.5)]).toEqual(['correct', 'incorrect', 'uncertain']);
});

it('first says in every hint what the child is looking for', () => {
  for (const hint of [...Object.values(answering?.hints ?? {}), ...Object.values(variation!.hints)])
    expect(hint).toMatch(/^我们在找/);
});

it("judges the variation's guess of three pebbles", () => {
  const check = variation!.checkGuess;
  expect([check(3), check(2), check('三颗')]).toEqual(['correct', 'incorrect', 'uncertain']);
});

it('counts a reason that says one more pebble went in as clear, and one denying it as not', () => {
  const reason = (say: string) => variation!.checkReason({ say });
  expect(reason('还是一颗一颗放的，多了一颗')).toBe('correct');
  expect(reason('放法没有变，多了一颗')).toBe('correct');
  expect(reason('因为有三颗')).toBe('correct');
  expect(reason('不是三颗')).toBe('incorrect');
  expect(reason('没有多，还是两颗')).toBe('incorrect');
  expect(reason('碗变大了')).toBe('incorrect');
});

it('judges the tapped reason: put in one by one kept, the count of pebbles changed', () => {
  const choose = (kept: string[], changed: string[]) =>
    variation!.checkReason({ choose: { kept, changed } });
  expect(choose(['one-by-one'], ['count'])).toBe('correct');
  expect(choose(['count'], ['one-by-one'])).toBe('incorrect');
  expect(choose([], [])).toBe('uncertain');
});
