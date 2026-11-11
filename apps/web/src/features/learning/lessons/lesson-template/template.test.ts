// @vitest-environment node
// The template's plugin holds its answer and runs only on the server, so it
// loads only in Node. This test checks the template against it the way
// registry.test.ts checks every registered lesson, since the template itself
// is never registered. A lesson copied from the template drops this file and
// is checked by the registry instead.
import { lessonTemplate } from '@education/problems/lesson-template';
import { expect, it } from 'vitest';
import voiceConfig from '../../../../../../../scripts/lesson-voice.json';
import { lessonProblems, narrationProblems, pluginOutline } from '../../../../test/lesson-check';
import { lessons } from '../registry';
import record from './assets/narration.json';
import { templateLesson } from './definition';

it('passes every check a registered lesson must pass, against its own plugin', () => {
  const plugin = pluginOutline(lessonTemplate);
  expect(lessonProblems(templateLesson.problem, templateLesson, plugin)).toEqual([]);
  expect(narrationProblems(templateLesson, voiceConfig, record)).toEqual([]);
});

it('is not registered, so no page is built for it', () => {
  expect(lessons.map(({ problem }) => problem.id)).not.toContain(templateLesson.problem.id);
});
