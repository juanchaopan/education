import nodemailer from 'nodemailer';
import { verificationEmail } from './verification-email.js';

export type MailOutcome =
  'accepted' | 'retryable' | 'rejected' | 'authorization-failed' | 'unknown';
export type MailSender = { send: (email: string, token: string) => Promise<MailOutcome> };
type Options = { user: string; password: string; origin: string };
type Transport = {
  sendMail: (mail: object) => Promise<{ accepted: unknown[]; rejected: unknown[] }>;
  close: () => void;
};
type SmtpFailure = { code?: string; responseCode?: number; command?: string };

export function classifySmtpError(error: unknown): MailOutcome {
  const failure = (error && typeof error === 'object' ? error : {}) as SmtpFailure;
  if (failure.code === 'EAUTH') return 'authorization-failed';
  if (failure.responseCode && failure.responseCode >= 500) return 'rejected';
  if (failure.responseCode && failure.responseCode >= 400) return 'retryable';
  // Nodemailer also reports CONN for a socket lost after DATA; it cannot prove non-delivery.
  return ['EHLO', 'HELO', 'STARTTLS', 'AUTH', 'MAIL FROM', 'RCPT TO'].includes(
    failure.command ?? '',
  )
    ? 'retryable'
    : 'unknown';
}

export function createGmailSender(options: Options, factory = gmailTransport): MailSender {
  return {
    send: async (email, token) => {
      const transport = factory(options);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          transport.close();
          reject(new Error('SMTP deadline'));
        }, 12000);
      });
      try {
        const result = await Promise.race([
          transport.sendMail({
            from: options.user,
            to: email,
            ...verificationEmail(options.origin, token),
            disableFileAccess: true,
            disableUrlAccess: true,
          }),
          deadline,
        ]);
        return result.accepted.length === 1 && result.rejected.length === 0
          ? 'accepted'
          : 'rejected';
      } catch (error) {
        return classifySmtpError(error);
      } finally {
        clearTimeout(timer);
        transport.close();
      }
    },
  };
}
function gmailTransport(options: Options): Transport {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: options.user, pass: options.password },
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 8000,
    logger: false,
    debug: false,
  });
}
