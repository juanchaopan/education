import { expect, it } from 'vitest';
import { createListening, endOfSpeechMs, firstWordMs } from './listening';

it('waits for a quiet moment after the child speaks before the answer counts as said', () => {
  const heard = createListening(0);
  expect(heard(0, 500)).toBe('listening');
  expect(heard(0.3, 1000)).toBe('listening');
  expect(heard(0.01, 1000 + endOfSpeechMs - 1)).toBe('listening');
  expect(heard(0.3, 2600)).toBe('listening');
  expect(heard(0, 2600 + endOfSpeechMs)).toBe('spoken');
});

it('gives up when no word comes in time, however long a word then takes', () => {
  expect(createListening(1000)(0, 1000 + firstWordMs)).toBe('nothing');
  const late = createListening(0);
  expect(late(0.3, firstWordMs - 1)).toBe('listening');
  expect(late(0.3, firstWordMs + 5000)).toBe('listening');
});
