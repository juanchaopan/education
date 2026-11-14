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
import { lessonOutline, lessons } from '../registry';
import record from './assets/narration.json';
import { templateLesson } from './definition';
import { arrive, respond } from './story';

const { problem } = templateLesson.content;

it('passes every check a registered lesson must pass, against its own plugin', () => {
  const plugin = pluginOutline(lessonTemplate);
  expect(lessonProblems(problem, lessonOutline(templateLesson), plugin)).toEqual([]);
  expect(narrationProblems(templateLesson, voiceConfig, record)).toEqual([]);
});

it('tells the teacher where the pebbles are and each one put in the bowl', () => {
  const { picture, action } = templateLesson.record;
  const start = arrive('look').state;
  const moved = respond(start, { kind: 'drop', place: 'bowl' })!.state;
  expect(picture(moved).things).toEqual([
    { place: 'table', thing: 'pebble', count: 1 },
    { place: 'bowl', thing: 'pebble', count: 1 },
  ]);
  expect(action(start, { kind: 'drop', place: 'bowl' }, true)).toBe('pebble-to-bowl');
  expect(action(start, { kind: 'drop', place: 'bowl' }, false)).toBeUndefined();
});

it('is not registered, so no page is built for it', () => {
  expect(lessons.map(({ problem: listed }) => listed.id)).not.toContain(problem.id);
});
