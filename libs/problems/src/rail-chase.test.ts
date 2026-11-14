import { describe, expect, it } from 'vitest';
import { lessonContentProblems } from './lesson-content.js';
import { railChaseLesson } from './lessons/rail-chase.js';
import { railChase, railChaseSteps } from './rail-chase.js';
import { problemRegistry } from './server.js';

const { answering } = railChase;
const check = (input: unknown) => answering?.checkCompletion(input as number[]);

describe('rail chase', () => {
  it('is a sixth grade 学而思 maths problem in the maintained registry', () => {
    expect(problemRegistry.find('rail-chase', 1)).toBe(railChase);
    expect(problemRegistry.summary('rail-chase', 1)).toMatchObject({
      grade: '六年级',
      subject: '数学',
      category: '学而思',
    });
    expect(problemRegistry.problemsOf('g6-math-xueersi').map(({ id }) => id)).toEqual([
      'rail-chase',
    ]);
  });

  it('follows 列式求解 with content that has no problems', () => {
    expect(railChaseLesson.flow).toBe('derive-and-solve');
    expect(lessonContentProblems(railChaseLesson)).toEqual([]);
  });

  it('counts both times, and only both, as correct', () => {
    expect(check([6, 14])).toBe('correct');
    expect(check([14, 6])).toBe('correct');
    for (const wrong of [[6], [14], [4], [10], [6, 14, 10], [3, 7]])
      expect(check(wrong)).toBe('incorrect');
  });

  it('treats anything but a list of whole numbers as not understood, never as a mistake', () => {
    for (const unclear of [6, '六秒和十四秒', [], [6.5, 14]])
      expect(check(unclear)).toBe('uncertain');
  });

  it('opens every scene to questions, with its own words and without the times', () => {
    for (const { prompt, vocabulary } of Object.values(railChaseSteps)) {
      expect(prompt).not.toMatch(/6|14|六秒|十四/);
      expect(vocabulary).toContain('相距');
    }
  });

  it('never says a time of the answer before the scene that asks for it', () => {
    const { shots, lines } = railChaseLesson;
    const asked = shots.indexOf('solve');
    const early = Object.values(lines).filter(({ scene }) => shots.indexOf(scene) <= asked);
    for (const { text } of early) expect(text).not.toMatch(/第六秒|十四秒|六秒|6 秒|14 秒/);
  });
});
