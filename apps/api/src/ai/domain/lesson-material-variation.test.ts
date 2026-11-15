import type { AnyLessonContent } from '@education/problems/lesson-content';
import { describe, expect, it } from 'vitest';
import { lessonMaterial } from './lesson-material.js';

// Three marbles roll into a cup and the child counts them; then a variation
// with four: the child guesses, works it out, says why and hears the result.
const marbles: AnyLessonContent = {
  problem: { id: 'marbles', version: 1 },
  flow: 'scene-by-scene',
  backdrop: 'toy-classroom-day',
  vocabulary: ['弹珠'],
  shots: ['roll', 'count', 'guess', 'try', 'why', 'reveal'],
  answerScene: 'count',
  variation: {
    guessScene: 'guess',
    reasonScene: 'why',
    revealScene: 'reveal',
    result: 'four-in-cup',
    keeps: ['one-cup'],
    choices: { cups: '杯子数', marbles: '弹珠数' },
  },
  lines: {
    start: { scene: 'roll', text: '弹珠要滚进杯子里了。' },
    howMany: { scene: 'count', text: '杯子里有几颗弹珠？' },
    four: { scene: 'guess', text: '假如有四颗弹珠，杯子里会有几颗？' },
    push: { scene: 'try', text: '推推看。' },
    why: { scene: 'why', text: '说说为什么。' },
    reveal: { scene: 'reveal', text: '杯子里有四颗。' },
  },
  scenes: {
    roll: { prompt: '地垫上有三颗弹珠和一个杯子。', entry: ['start'] },
    count: { prompt: '弹珠都在杯子里，孩子数一数。', entry: ['howMany'] },
    guess: { prompt: '假如有四颗弹珠，孩子猜一猜。', entry: ['four'] },
    try: { prompt: '孩子把四颗弹珠推进杯子。', entry: ['push'] },
    why: { prompt: '孩子说说为什么。', entry: ['why'] },
    reveal: { prompt: '老师说出结果。', entry: ['reveal'] },
  },
  conclusions: [
    { id: 'one-cup', says: '所有弹珠都滚进同一个杯子', from: 'roll' },
    {
      id: 'three-in-cup',
      says: '杯子里的弹珠数一数',
      from: 'count',
      answer: { says: '杯子里有 3 颗弹珠' },
    },
    { id: 'four-marbles', says: '假如有 4 颗弹珠', from: 'guess', supposed: true },
    { id: 'four-in-cup', says: '那么杯子里有 4 颗弹珠', from: 'reveal' },
  ],
  recordWords: {
    places: { mat: '地垫上', cup: '杯子里' },
    things: { marble: { name: '弹珠', unit: '颗' } },
    states: {},
    actions: {},
  },
};

const empty = { now: { things: [], states: [] }, ended: [], actions: [] };
const at = (shot: string) => lessonMaterial(marbles, shot, empty, true);

describe('the lesson so far in a variation, which is another problem', () => {
  it('tells only the conclusions found before the variation starts', () => {
    expect(at('count')).toMatchObject({ found: ['所有弹珠都滚进同一个杯子'] });
    expect(at('count')).not.toHaveProperty('variation');
  });

  it("tells the problem's conclusions apart from the condition the variation sets", () => {
    const problem = ['所有弹珠都滚进同一个杯子', '杯子里有 3 颗弹珠'];
    expect(at('guess')).toMatchObject({ found: problem, variation: ['假如有 4 颗弹珠'] });
    expect(at('why')).toMatchObject({ found: problem, variation: ['假如有 4 颗弹珠'] });
  });

  it('tells what the variation came to only from the scene that reveals it', () => {
    expect(at('reveal')?.variation).toEqual(['假如有 4 颗弹珠', '那么杯子里有 4 颗弹珠']);
    for (const shot of ['guess', 'try', 'why'])
      expect(JSON.stringify(at(shot))).not.toContain('那么');
  });
});
