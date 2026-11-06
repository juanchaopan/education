import { expect, it } from 'vitest';
import { helpOptions, recordHelp } from './model';

const step = {
  id: 'observe',
  instruction: '看看左边的图形。',
  retryInstruction: '从左上角开始看。',
  hint: '找找有没有尖角。',
  example: '方方的书有尖角。',
  demonstration: '先沿着边走一圈，再数角。',
};

it('records repeat and retry independently from the hint ladder', () => {
  const events = recordHelp([], step.id, 'repeat');
  const retries = recordHelp(recordHelp(events, step.id, 'retry'), step.id, 'retry');
  expect(retries).toEqual([
    { stepId: 'observe', kind: 'repeat' },
    { stepId: 'observe', kind: 'retry' },
    { stepId: 'observe', kind: 'retry' },
  ]);
  expect(helpOptions(step, retries).next?.kind).toBe('hint');
});

it('reveals the ladder in order and starts fresh on another step', () => {
  const hint = recordHelp([], step.id, 'hint');
  expect(helpOptions(step, hint)).toMatchObject({
    shown: { kind: 'hint' },
    next: { kind: 'example' },
  });
  const example = recordHelp(hint, step.id, 'example');
  const demonstration = recordHelp(example, step.id, 'demonstration');
  expect(helpOptions(step, demonstration)).toMatchObject({ shown: { kind: 'demonstration' } });
  expect(helpOptions(step, demonstration).next).toBeUndefined();
  expect(helpOptions({ ...step, id: 'reflect' }, demonstration).next?.kind).toBe('hint');
  expect(helpOptions({ ...step, example: undefined }, hint).next?.kind).toBe('demonstration');
});
