import type { LessonRecord, ScenePicture } from '@education/contracts';
import { backdropScenery } from '@education/problems/backdrops';
import type { ScenePicture as DeclaredPicture } from '@education/problems/lesson-content';
import { gardenBalanceLesson as garden } from '@education/problems/lessons/garden-balance';
import { describe, expect, it } from 'vitest';
import { gardenPictures as pictures, gardenRecordAt } from './garden-record-fixtures.js';
import { lessonMaterial, pictureText } from './lesson-material.js';

const { shots, scenes, lines, conclusions, recordWords } = garden;
type Shot = (typeof shots)[number];

// The lesson so far for a child the server has seen answer the garden right.
const materialAt = (shot: Shot, record = gardenRecordAt(shot)) =>
  lessonMaterial(garden, shot, record, true);
const told = (shot: Shot) => JSON.stringify(materialAt(shot));

describe('the lesson so far', () => {
  it.each(shots.map((shot, at) => [shot, at] as const))(
    'from %s holds nothing of a later scene',
    (shot, at) => {
      const text = told(shot);
      for (const later of shots.slice(at + 1)) {
        expect(text).not.toContain(scenes[later].prompt);
        for (const line of Object.values(lines).filter(({ scene }) => scene === later))
          expect(text).not.toContain(line.text);
      }
      for (const { says, from } of conclusions)
        if (shots.indexOf(from) >= at) expect(text).not.toContain(says);
    },
  );

  it.each(shots.slice(0, shots.indexOf(garden.answerScene) + 1))(
    'from %s, up to the scene that asks for it, holds no final answer',
    (shot) => {
      const text = told(shot);
      for (const { answer } of conclusions) if (answer) expect(text).not.toContain(answer.says);
      expect(text).not.toMatch(/9|九/);
    },
  );

  it('writes the final answer on its conclusion past the scene that asks for it', () => {
    expect(materialAt('variation')?.found).toEqual([
      '1 棵青菜和 3 个苹果一样重',
      '1 个苹果和 3 根黄瓜一样重',
      '1 棵青菜和 3 组黄瓜一样重，一共 9 根黄瓜',
    ]);
  });

  it('tells a scene past the one that asks for the answer only to a child who answered right', () => {
    expect(lessonMaterial(garden, 'variation', gardenRecordAt('variation'), false)).toBeUndefined();
    expect(lessonMaterial(garden, 'end', gardenRecordAt('end'), false)).toBeUndefined();
    expect(lessonMaterial(garden, 'answer', gardenRecordAt('answer'), false)).toBeDefined();
  });

  it('tells the conclusions found before the scene asked about, with or without a board', () => {
    expect(materialAt('leaves')?.found).toEqual([]);
    expect(materialAt('apples')?.found).toEqual([]);
    expect(materialAt('bridge')?.found).toEqual([
      '1 棵青菜和 3 个苹果一样重',
      '1 个苹果和 3 根黄瓜一样重',
    ]);
  });

  it('tells each earlier scene with all it said and how it ended, and this one as it began', () => {
    const material = materialAt('exchange');
    expect(material?.earlier[1]).toEqual({
      scene: 2,
      step: scenes.apples.prompt,
      said: [lines.tip.text, lines.halve.text, lines.balanced.text],
      picture:
        '天平左盘（画面左边）：1 棵青菜；天平右盘（画面右边）：3 个苹果；天平右边的篮子：1 棵青菜、3 个苹果。天平是平的。',
    });
    expect(material?.now).toEqual({
      scene: 3,
      step: scenes.exchange.prompt,
      said: [lines.one.text],
      picture: '天平左盘（画面左边）：1 个苹果；天平右盘（画面右边）：3 根黄瓜。天平是平的。',
    });
  });

  it("tells the child's key actions with their scene and how many times", () => {
    expect(materialAt('end')?.done).toEqual([
      '第 1 幕：把一棵青菜拖进篮子',
      '第 2 幕：从右盘拿走一个苹果放进篮子（3 次）',
      '第 3 幕：碰了碰苹果',
      '第 4 幕：把一个苹果换成一组黄瓜（3 次）',
      '第 6 幕：把一个苹果换成一组黄瓜（3 次）',
    ]);
  });

  it('leaves out the pictures of scenes the page did not see, as after picking up a saved place', () => {
    const material = materialAt('bridge', { now: pictures.bridge, ended: [], actions: [] });
    expect(material?.earlier.map(({ picture }) => picture)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(material?.earlier[2]?.said).toEqual([lines.one.text, lines.three.text]);
    expect(material?.done).toEqual([]);
  });

  it("tells the backdrop's scenery", () => {
    expect(materialAt('leaves')?.scenery).toBe(backdropScenery['garden-morning']);
  });
});

describe('a picture in words', () => {
  it('is the scene picture the question request carries, field for field', () => {
    const carried: ScenePicture = {
      things: [{ place: 'left-pan', thing: 'apple', count: 1 }],
      states: [],
    };
    const declared: Required<DeclaredPicture> = carried;
    const back: Required<ScenePicture> = declared;
    expect(back).toBe(carried);
  });

  it('says an empty place is empty and lists how the picture stands', () => {
    const opening = {
      things: [
        { place: 'left-pan', thing: 'cabbage', count: 2 },
        { place: 'right-pan', thing: 'apple', count: 6 },
        { place: 'basket', thing: 'cabbage', count: 0 },
      ],
      states: ['level'],
    };
    expect(pictureText(recordWords, opening)).toBe(
      '天平左盘（画面左边）：2 棵青菜；天平右盘（画面右边）：6 个苹果；天平右边的篮子：空的。天平是平的。',
    );
    expect(pictureText(recordWords, { things: [], states: ['apples-down'] })).toBe(
      '苹果这边沉下去了。',
    );
    expect(pictureText(recordWords, pictures.end)).toBe(
      '天平左盘（画面左边）：1 棵青菜；天平右盘（画面右边）：3 组黄瓜，每组 2 根；天平右边的篮子：2 根黄瓜。天平是平的，篮子上写着「一个苹果换两根」。',
    );
  });
});

describe('a record that does not fit the lesson', () => {
  const record = gardenRecordAt('bridge');
  const [first] = record.ended;
  it.each<[string, LessonRecord]>([
    [
      'a place it does not declare',
      { ...record, now: { things: [{ place: 'roof', thing: 'apple', count: 1 }], states: [] } },
    ],
    [
      'a thing it does not declare',
      { ...record, now: { things: [{ place: 'basket', thing: 'pear', count: 1 }], states: [] } },
    ],
    ['a state it does not declare', { ...record, now: { things: [], states: ['tilted'] } }],
    [
      'an action it does not declare',
      { ...record, actions: [{ stepId: 'leaves', action: 'jump', times: 1 }] },
    ],
    [
      'an action in a later scene',
      { ...record, actions: [{ stepId: 'answer', action: 'apple-swapped', times: 1 }] },
    ],
    [
      'the picture of a later scene',
      { ...record, ended: [{ stepId: 'end', picture: pictures.end }] },
    ],
    [
      'the picture of the scene asked about as an earlier one',
      { ...record, ended: [{ stepId: 'bridge', picture: pictures.bridge }] },
    ],
    ['earlier pictures out of order', { ...record, ended: [...record.ended].reverse() }],
    ['an earlier picture twice', { ...record, ended: [first!, first!] }],
    [
      'a scene it does not have',
      { ...record, ended: [{ stepId: 'roof', picture: pictures.leaves }] },
    ],
    ['a name that is no word of its own', { ...record, now: { things: [], states: ['toString'] } }],
  ])('is refused when it names %s', (_name, wrong) => {
    expect(lessonMaterial(garden, 'bridge', wrong, true)).toBeUndefined();
  });

  it('is refused for a scene the lesson does not have', () => {
    expect(lessonMaterial(garden, 'roof', record, true)).toBeUndefined();
  });
});
