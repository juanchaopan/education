import { describe, expect, it } from 'vitest';
import { fixtureLesson } from '../../../test/lesson-fixture';
import { backdrops } from '../media/backdrops/backdrops';
import { teachers } from '../media/teachers/teachers';
import {
  filmStory,
  guidance,
  lessonTeacher,
  resumed,
  shotAfter,
  stageLook,
} from './lesson-definition';

const { script } = fixtureLesson;

describe('lesson definitions', () => {
  it('start the film at the first scene, with the lesson rules and lines', () => {
    const story = filmStory(script, fixtureLesson.story);
    expect(story).toMatchObject({ first: 'look', opening: { shot: 'opening' } });
    expect(story.lines).toBe(script.lines);
    expect(story.arrive('count').say).toEqual(['ask']);
  });

  it('give the stage the title, names, library pictures, palette and framing', () => {
    const cameras = { count: { zoom: 1.2 } };
    const { image, focus } = backdrops['garden-morning'];
    expect(stageLook({ ...fixtureLesson, script: { ...script, cameras } })).toEqual({
      label: '示例互动短片',
      worldLabel: '可互动的示例道具',
      title: '示例题目',
      theater: '示例小剧场',
      backdrop: { image, focus },
      teacher: lessonTeacher(fixtureLesson.teacher),
      palette: fixtureLesson.palette,
      cameras,
    });
  });

  it('cast the library teacher where the lesson puts it', () => {
    const { place, ground } = fixtureLesson.teacher;
    expect(lessonTeacher(fixtureLesson.teacher)).toEqual({
      name: '小兔',
      image: teachers.rabbit.image,
      place,
      ground,
    });
  });

  it("take a scene's instruction from its last entry line, or none when it says nothing", () => {
    expect(guidance(script, 'count')).toBe('一共有几颗？');
    expect(guidance({ ...script, entryLines: { ...script.entryLines, count: [] } }, 'count')).toBe(
      '',
    );
  });

  it('follow a scene with the next one in teaching order, and nothing else', () => {
    expect(shotAfter(script, 'look')).toBe('count');
    expect(shotAfter(script, 'after')).toBeUndefined();
    expect(shotAfter({ shots: ['look', 'count'] }, 'after')).toBeUndefined();
  });

  it('resume only at a scene of the lesson past its first', () => {
    expect(resumed(script, 'count')).toBe('count');
    expect(resumed(script, 'look')).toBeUndefined();
    expect(resumed(script, 'missing')).toBeUndefined();
  });
});
