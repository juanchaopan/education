import { expect, it } from 'vitest';
import { registrationIssue } from './registration.js';

it.each([
  'a..b@example.com',
  'a.@example.com',
  'a,b@example.com',
  'parent@-example.com',
  'parent@example',
  'parent@example.com\r\nBcc: other@example.com',
])('rejects malformed email %s', (email) => {
  expect(registrationIssue(email, 'a private phrase with many words')).toBeDefined();
});
it.each(['parent+school@126.com', 'parent.name@example.com', 'parent@sub.example.com'])(
  'accepts common mailbox formats %s',
  (email) => {
    expect(registrationIssue(email, 'a private phrase with many words')).toBeUndefined();
  },
);
