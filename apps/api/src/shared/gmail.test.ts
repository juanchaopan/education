import { verificationEmail } from './verification-email.js';
import { describe, expect, it, vi } from 'vitest';
import { classifySmtpError, createGmailSender } from './gmail.js';

describe('SMTP outcomes', () => {
  it.each([
    [{ code: 'EAUTH', responseCode: 535 }, 'authorization-failed'],
    [{ responseCode: 421 }, 'retryable'],
    [{ responseCode: 550 }, 'rejected'],
    [{ code: 'ETIMEDOUT', command: 'CONN' }, 'unknown'],
    [{ code: 'ETIMEDOUT', command: 'DATA' }, 'unknown'],
    [{ code: 'ECONNRESET' }, 'unknown'],
    [new Error('private SMTP reply'), 'unknown'],
  ])('classifies %j without retaining provider text', (error, outcome) => {
    expect(classifySmtpError(error)).toBe(outcome);
  });
  it('uses a trusted HTTPS origin and reports acceptance without claiming delivery', async () => {
    const sendMail = vi.fn().mockResolvedValue({ accepted: ['parent@example.test'], rejected: [] });
    const close = vi.fn();
    const sender = createGmailSender(
      {
        user: 'sender@gmail.com',
        password: 'test-only',
      },
      (token) => verificationEmail('https://school.example', token),
      () => ({ sendMail, close }),
    );
    expect(await sender.send('parent@example.test', 'a'.repeat(43))).toBe('accepted');
    const mail = sendMail.mock.calls[0]![0];
    expect(mail.from).toBe('sender@gmail.com');
    expect(mail.text).toContain('https://school.example/family/verify#token=');
    expect(mail.text).not.toContain('hyp.app');
    const links = [...mail.html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
    expect(links).toEqual(
      Array(2).fill(`https://school.example/family/verify#token=${'a'.repeat(43)}`),
    );
    expect(mail.html).toContain('>验证家长邮箱</a>');
    expect(mail.html).toContain('<html lang="zh-CN">');
    expect(mail.html).not.toMatch(/<(script|img|link|form)\b/i);
    expect(close).toHaveBeenCalledOnce();
  });
});
it('bounds a stalled send at twelve seconds and reports unknown without starting another send', async () => {
  vi.useFakeTimers();
  const close = vi.fn();
  const sendMail = vi.fn().mockImplementation(() => new Promise(() => {}));
  try {
    const sender = createGmailSender(
      { user: 'sender@gmail.com', password: 'test' },
      (token) => verificationEmail('https://school.example', token),
      () => ({ sendMail, close }),
    );
    const result = sender.send('parent@example.test', 'a'.repeat(43));
    await vi.advanceTimersByTimeAsync(12000);
    expect(await result).toBe('unknown');
    expect(sendMail).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
