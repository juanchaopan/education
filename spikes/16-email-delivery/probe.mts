import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import nodemailer, { type SendMailOptions, type SMTPTransportOptions } from 'nodemailer';

export type Purpose = 'verify' | 'reset';
export type Outcome =
  'auth-or-policy' | 'temporary-rejection' | 'permanent-rejection' | 'unknown-delivery';

const siteOrigin = 'https://education-access-spike.hyp.app';

export function gmailCredentials() {
  return { user: process.env.GMAIL_USER ?? '', password: process.env.GMAIL_APP_PASSWORD ?? '' };
}

export function mailbox(value: string): string {
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(value)) {
    throw new Error('Expected one plain email address without display names or whitespace');
  }
  return value;
}

export function message(
  from: string,
  to: string,
  purpose: Purpose,
  runId: string,
): SendMailOptions {
  mailbox(from);
  mailbox(to);
  if (!/^[a-f0-9]{16}$/.test(runId)) throw new Error('Invalid probe identifier');
  if (purpose !== 'verify' && purpose !== 'reset') throw new Error('Invalid purpose');
  const label = purpose === 'verify' ? '注册验证' : '找回密码';
  const link = new URL('/', siteOrigin);
  link.searchParams.set('mail_probe', runId);
  link.searchParams.set('purpose', purpose);
  const content = `这是小小探索家的${label}投递测试，不会创建账号或重置密码。\n\n请确认中文正常显示，并记录收到时间、收件箱或垃圾箱位置。\n测试编号：${runId}\n\n打开测试网站：${link.href}\n\n这个链接只打开已有网络测试页，不是有效的账号操作链接。邮件中没有儿童信息。`;
  const html =
    content
      .split('\n')
      .map(
        (line) =>
          `<p>${line.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</p>`,
      )
      .join('') + `<p><a href="${link.href.replaceAll('&', '&amp;')}">打开测试网站</a></p>`;
  return {
    from: { name: '小小探索家测试', address: from },
    to: { address: to, name: '' },
    subject: `【投递测试】${label} · ${runId}`,
    text: content,
    html,
    disableFileAccess: true,
    disableUrlAccess: true,
    headers: { 'X-Education-Probe': runId },
  };
}

export function smtpOptions(user: string, appPassword: string): SMTPTransportOptions {
  mailbox(user);
  if (!user.toLowerCase().endsWith('@gmail.com'))
    throw new Error('This probe supports personal Gmail senders only');
  if (!/^[a-z]{16}$/.test(appPassword))
    throw new Error('Expected a 16-letter app password without spaces');
  return {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass: appPassword },
    tls: { servername: 'smtp.gmail.com', rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    dnsTimeout: 5000,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export function classify(error: unknown): Outcome {
  if (!error || typeof error !== 'object') return 'unknown-delivery';
  const details = error as { code?: unknown; responseCode?: unknown };
  if (details.code === 'EAUTH' || details.responseCode === 535) return 'auth-or-policy';
  if (typeof details.responseCode !== 'number') return 'unknown-delivery';
  if (details.responseCode >= 400 && details.responseCode < 500) return 'temporary-rejection';
  if (details.responseCode >= 500 && details.responseCode < 600) return 'permanent-rejection';
  return 'unknown-delivery';
}

export async function deliver(from: string, to: string, password: string, purpose: Purpose) {
  const runId = randomBytes(8).toString('hex');
  const mail = message(from, to, purpose, runId);
  const transport = nodemailer.createTransport(smtpOptions(from, password));
  const started = performance.now();
  const startedAt = new Date().toISOString();
  try {
    const info = await transport.sendMail(mail);
    const accepted = info.accepted.length === 1 && info.rejected.length === 0;
    return {
      runId,
      purpose,
      startedAt,
      smtpMs: Math.round(performance.now() - started),
      status: accepted ? 'smtp-accepted-inbox-unconfirmed' : 'smtp-not-accepted',
      inboxConfirmed: false,
    };
  } catch (error: unknown) {
    return {
      runId,
      purpose,
      startedAt,
      smtpMs: Math.round(performance.now() - started),
      status: classify(error),
      automaticallyRetried: false,
    };
  } finally {
    transport.close();
  }
}

async function preview(purpose: Purpose): Promise<void> {
  const runId = randomBytes(8).toString('hex');
  const transport = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'windows',
  });
  const info = await transport.sendMail(
    message('sender@example.invalid', 'recipient@example.invalid', purpose, runId),
  );
  if (!Buffer.isBuffer(info.message)) throw new Error('Expected buffered MIME');
  console.log(
    JSON.stringify({
      mode: 'offline-preview',
      purpose,
      runId,
      mimeBytes: info.message.length,
      sent: false,
    }),
  );
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--send') || args.length > 1)
    throw new Error('Use no arguments for preview, or --send for one real message');
  const purpose = process.env.MAIL_PROBE_PURPOSE ?? 'verify';
  if (purpose !== 'verify' && purpose !== 'reset') throw new Error('Invalid purpose');
  if (args[0] !== '--send') return preview(purpose);
  const to = mailbox(process.env.MAIL_PROBE_TO ?? '');
  if (process.env.MAIL_PROBE_CONFIRM_TO !== to)
    throw new Error('Recipient must be explicitly confirmed');
  const { user, password } = gmailCredentials();
  const result = await deliver(user, to, password, purpose);
  console.log(JSON.stringify({ mode: 'live', ...result }));
  if (result.status !== 'smtp-accepted-inbox-unconfirmed') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(() => {
    console.error(
      'Probe configuration or MIME generation failed; no raw error or credential logged. Check SPIKE.md.',
    );
    process.exitCode = 1;
  });
}
