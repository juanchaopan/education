import { expect, it, vi } from 'vitest';
import { createSubtitle } from './subtitle';

it('shows the newest words any source said', () => {
  const subtitle = createSubtitle();
  subtitle.say('narration', { text: '碰一碰这个苹果。' });
  subtitle.say('question', { text: '数一数右盘有几组黄瓜。' });
  expect(subtitle.newest()).toEqual({ source: 'question', text: '数一数右盘有几组黄瓜。' });
  subtitle.say('narration', { text: '一个苹果换三根黄瓜。' });
  expect(subtitle.newest()).toEqual({ source: 'narration', text: '一个苹果换三根黄瓜。' });
});

it('makes the same words the newest again when they are brought back', () => {
  const subtitle = createSubtitle();
  subtitle.say('narration', { text: '碰一碰这个苹果。', again: 0 });
  subtitle.say('question', { text: '数一数右盘有几组黄瓜。' });
  subtitle.say('narration', { text: '碰一碰这个苹果。', again: 1 });
  expect(subtitle.newest()).toMatchObject({ source: 'narration', text: '碰一碰这个苹果。' });
});

it('goes back to the words before once the newest source falls quiet', () => {
  const subtitle = createSubtitle();
  subtitle.say('narration', { text: '碰一碰这个苹果。' });
  subtitle.say('answer', { text: '我听到你说「九根」，是 9 吗？' });
  subtitle.say('answer', undefined);
  expect(subtitle.newest()).toEqual({ source: 'narration', text: '碰一碰这个苹果。' });
  subtitle.say('narration', { text: '' });
  expect(subtitle.newest()).toBeUndefined();
});

it('keeps hidden words as the newest, so older words do not come back', () => {
  const subtitle = createSubtitle();
  subtitle.say('question', { text: '数一数右盘有几组黄瓜。' });
  subtitle.say('narration', { text: '一个苹果换三根黄瓜。', hidden: true });
  expect(subtitle.newest()).toMatchObject({ source: 'narration', hidden: true });
});

it('counts the teacher thinking as something said', () => {
  const subtitle = createSubtitle();
  subtitle.say('narration', { text: '碰一碰这个苹果。' });
  subtitle.say('question', { thinking: true });
  expect(subtitle.newest()).toEqual({ source: 'question', thinking: true });
});

it('tells its listeners only when the words change', () => {
  const subtitle = createSubtitle();
  const heard = vi.fn();
  const stop = subtitle.subscribe(heard);
  subtitle.say('hint', { text: '先看第一架秤。' });
  subtitle.say('hint', { text: '先看第一架秤。' });
  expect(heard).toHaveBeenCalledOnce();
  stop();
  subtitle.say('hint', { text: '再看第二架秤。' });
  expect(heard).toHaveBeenCalledOnce();
});
