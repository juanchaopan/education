import { expect, it } from 'vitest';
import { spokenNumber, spokenNumbers } from './spoken-number';

it('reads the number a child says in Chinese or Arabic numerals', () => {
  expect(spokenNumber('九根')).toBe(9);
  expect(spokenNumber('是9根黄瓜')).toBe(9);
  expect(spokenNumber('９')).toBe(9);
  expect(spokenNumber('十')).toBe(10);
  expect(spokenNumber('十二根')).toBe(12);
  expect(spokenNumber('二十')).toBe(20);
  expect(spokenNumber('两根')).toBe(2);
  expect(spokenNumber('零')).toBe(0);
});

it('accepts the same number said twice', () => {
  expect(spokenNumber('九，9根')).toBe(9);
  expect(spokenNumbers('六秒，6秒')).toEqual([6]);
});

it('does not take the 一 of an ordinary word for a number', () => {
  expect(spokenNumber('九根黄瓜一样重')).toBe(9);
  expect(spokenNumber('一共九根')).toBe(9);
});

it('lets the number said with the answer’s unit decide', () => {
  expect(spokenNumber('一棵青菜和九根黄瓜一样重', '根')).toBe(9);
  expect(spokenNumber('三组，每组三根，一共九根', '根')).toBeUndefined();
  expect(spokenNumber('九', '根')).toBe(9);
});

it('leaves the answer unknown when no number, two numbers or an unreadable one is heard', () => {
  expect(spokenNumber('黄瓜')).toBeUndefined();
  expect(spokenNumber('三组，每组三根，一共九根')).toBeUndefined();
  expect(spokenNumber('九九')).toBeUndefined();
  expect(spokenNumber('十十')).toBeUndefined();
  expect(spokenNumber('')).toBeUndefined();
});

it('reads every number of a list, once each, in the order said', () => {
  expect(spokenNumbers('六秒和十四秒', '秒')).toEqual([6, 14]);
  expect(spokenNumbers('14秒、6秒', '秒')).toEqual([14, 6]);
  expect(spokenNumbers('6和14')).toEqual([6, 14]);
  expect(spokenNumbers('第六秒，还有第十四秒', '秒')).toEqual([6, 14]);
});

it('counts a number listed right before one said with the unit', () => {
  expect(spokenNumbers('6 和 14 秒', '秒')).toEqual([6, 14]);
  expect(spokenNumbers('六、十四秒', '秒')).toEqual([6, 14]);
});

it('leaves out the numbers of the working when some are said with the unit', () => {
  expect(spokenNumbers('十减 t 等于四，所以是第六秒', '秒')).toEqual([6]);
  expect(spokenNumbers('十减四是六，第六秒', '秒')).toEqual([6]);
});

it('hears no list where no number or an unreadable one is said', () => {
  expect(spokenNumbers('不知道', '秒')).toBeUndefined();
  expect(spokenNumbers('六秒和十十秒', '秒')).toBeUndefined();
});
