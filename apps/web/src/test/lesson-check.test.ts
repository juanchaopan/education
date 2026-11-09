import { describe, expect, it } from 'vitest';
import type { LessonOutline } from '../features/learning/lessons/registry';
import { lessonProblems, type PluginOutline } from './lesson-check';
import { fixtureLesson } from './lesson-fixture';

const listed = { id: 'fixture', version: 1 };
const plugin: PluginOutline = { steps: ['look', 'count', 'after'], hints: ['look-again'] };
const outline: LessonOutline = fixtureLesson;
const { script } = outline;

function problems(change: Partial<LessonOutline>, against = plugin) {
  return lessonProblems(listed, { ...outline, ...change }, against);
}

describe('the lesson definition check', () => {
  it('passes a lesson that agrees with its registry line and its plugin', () => {
    expect(problems({})).toEqual([]);
  });

  it('finds a line without a recording', () => {
    const lines = { ...script.lines, ask: { text: '一共有几颗？', clip: '' } };
    expect(problems({ script: { ...script, lines } })).toEqual(['line ask has no recording']);
  });

  it('finds a scene without entry lines, or with a line the script lacks', () => {
    const entryLines = { ...script.entryLines, count: [], after: ['gone'] };
    expect(problems({ script: { ...script, entryLines } })).toEqual([
      'scene count has no entry lines',
      'entry line gone is not in the script',
    ]);
  });

  it('finds an answer scene that is not a scene', () => {
    const answer = { ...outline.answer, shot: 'counting' };
    expect(problems({ answer })).toEqual(['answer scene counting is not a scene']);
  });

  it('finds an answer scene with no scene after it to play on into', () => {
    const answer = { ...outline.answer, shot: 'after' };
    expect(problems({ answer })).toEqual(['answer scene after has no scene after it']);
  });

  it('finds scenes and plugin steps that do not match', () => {
    const steps = ['look', 'count', 'later'];
    expect(problems({}, { ...plugin, steps })).toEqual([
      'scene after is not a plugin step',
      'plugin step later is not a scene',
    ]);
  });

  it('finds an answer hint the plugin does not have', () => {
    const answer = { ...outline.answer, hints: ['look-again', 'count-twice'] };
    expect(problems({ answer })).toEqual(['hint count-twice is not in the plugin']);
  });

  it('finds a version the definition does not share with its registry line', () => {
    expect(problems({ problem: { id: 'fixture', version: 2 } })).toEqual([
      'registered as fixture/1 but defined as fixture/2',
    ]);
  });

  it('finds a version the server keeps no plugin for', () => {
    expect(lessonProblems(listed, outline, undefined)).toEqual([
      'the server has no plugin for fixture/1',
    ]);
  });
});
