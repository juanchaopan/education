import { expect, it } from 'vitest';
import { lessonTemplate, lessonTemplateBook } from './lesson-template.js';
import { createProblemRegistry } from './plugin.js';
import { problemRegistry } from './server.js';

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
  const check = lessonTemplate.answering!.checkCompletion;
  expect([check(2), check(3), check(2.5)]).toEqual(['correct', 'incorrect', 'uncertain']);
});
