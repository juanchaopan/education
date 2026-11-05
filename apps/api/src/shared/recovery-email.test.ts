import { expect, it } from 'vitest';
import { recoveryEmail } from './recovery-email.js';
it('uses clickable trusted recovery links, explains expiry and does not load third-party content', () => {
  const token = 'r'.repeat(43),
    mail = recoveryEmail('https://school.example', token);
  const link = `https://school.example/family/reset#token=${token}`;
  expect(mail.text).toContain(link);
  expect(mail.text).toContain('30 分钟');
  expect([...mail.html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((match) => match[1])).toEqual([
    link,
    link,
  ]);
  expect(mail.html).toContain('>重设家长密码</a>');
  expect(mail.html).not.toMatch(/<(script|img|link|form)\b/i);
});
