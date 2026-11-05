import { expect, it, afterEach } from 'vitest';
import { rememberedChild, rememberChild } from './child-locator';
afterEach(() => localStorage.clear());
it('remembers only family and nickname after login, and supports forgetting the device', () => {
  const input = { familyCode: 'ABCD-EFGH-JKMN', nickname: '小鹿', pin: '018274' };
  rememberChild(input, true);
  expect(rememberedChild()).toEqual({ familyCode: 'ABCD-EFGH-JKMN', nickname: '小鹿' });
  expect(JSON.stringify(localStorage)).not.toContain('018274');
  rememberChild({ familyCode: 'ABCD-EFGH-JKMN', nickname: '小鹿' }, false);
  expect(rememberedChild()).toEqual({ familyCode: '', nickname: '' });
});
it('ignores malformed or oversized local values', () => {
  for (const value of [
    '{',
    'null',
    '{"familyCode":12}',
    JSON.stringify({ familyCode: 'x'.repeat(1000), nickname: 'a' }),
  ]) {
    localStorage.setItem('education-child-locator', value);
    expect(rememberedChild()).toEqual({ familyCode: '', nickname: '' });
  }
});
