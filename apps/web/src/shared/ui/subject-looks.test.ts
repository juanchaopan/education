import { expect, it } from 'vitest';
import { subjectLook } from './subject-looks';

it('draws each known subject in its own colours with its own icon', () => {
  expect(subjectLook('数学')).toEqual({ tone: 'math', icon: 'math' });
  expect(subjectLook('语文')).toEqual({ tone: 'chinese', icon: 'chinese' });
  expect(subjectLook('英语')).toEqual({ tone: 'english', icon: 'english' });
});

it('draws a subject it does not know as a closed book on wheat', () => {
  expect(subjectLook('科学')).toEqual({ tone: 'other', icon: 'book' });
  expect(subjectLook('toString')).toEqual({ tone: 'other', icon: 'book' });
});
