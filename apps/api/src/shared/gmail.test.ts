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
        origin: 'https://school.example',
      },
      () => ({ sendMail, close }),
    );
    expect(await sender.send('parent@example.test', 'a'.repeat(43))).toBe('accepted');
    const mail = sendMail.mock.calls[0]![0];
    expect(mail.from).toBe('sender@gmail.com');
    expect(mail.text).toContain('https://school.example/family/verify#token=');
    expect(mail.text).not.toContain('hyp.app');
    expect(close).toHaveBeenCalledOnce();
  });
});
