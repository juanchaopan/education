import { describe, expect, it } from 'vitest';
import { fixtureLesson } from '../../../test/lesson-fixture';
import { filmStory, guidance, resumes, shotAfter, stageLook } from './lesson-definition';

describe('lesson definitions', () => {
  it('start the film at the first scene, with the lesson rules and lines', () => {
    const story = filmStory(fixtureLesson);
    expect(story).toMatchObject({ first: 'look', opening: { shot: 'opening' } });
    expect(story.lines).toBe(fixtureLesson.script.lines);
    expect(story.arrive('count').say).toEqual(['ask']);
  });

  it('give the stage the title, names, pictures, palette and framing', () => {
    expect(stageLook(fixtureLesson)).toEqual({
      label: '示例互动短片',
      worldLabel: '可互动的示例道具',
      title: '示例题目',
      theater: '示例小剧场',
      backdrop: fixtureLesson.backdrop,
      teacher: fixtureLesson.teacher,
      palette: fixtureLesson.palette,
      cameras: undefined,
    });
  });

  it("take a scene's instruction from its last entry line", () => {
    expect(guidance(fixtureLesson, 'count')).toBe('一共有几颗？');
    expect(guidance(fixtureLesson, 'missing')).toBe('');
  });

  it('follow a scene with the next one in teaching order', () => {
    expect(shotAfter(fixtureLesson, 'look')).toBe('count');
    expect(shotAfter(fixtureLesson, 'after')).toBeUndefined();
    expect(shotAfter(fixtureLesson, 'missing')).toBeUndefined();
  });

  it('resume only at a scene of the lesson past its first', () => {
    expect(resumes(fixtureLesson, 'count')).toBe(true);
    expect(resumes(fixtureLesson, 'look')).toBe(false);
    expect(resumes(fixtureLesson, 'missing')).toBe(false);
  });
});
