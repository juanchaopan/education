import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import nodemailer from 'nodemailer';
import { classify, deliver, gmailCredentials, mailbox, smtpOptions } from '../probe.mts';

type Action =
  | { action: 'connect' }
  | { action: 'send'; purpose: 'verify' | 'reset'; recipient: 'qq' | '163'; consent: true };

function reply(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

export function validateAction(value: unknown): Action {
  if (!value || typeof value !== 'object') throw new Error('Invalid request');
  const input = value as Record<string, unknown>;
  if (input.action === 'connect') return { action: 'connect' };
  if (input.action !== 'send' || input.consent !== true)
    throw new Error('Explicit recipient consent is required');
  if (input.purpose !== 'verify' && input.purpose !== 'reset') throw new Error('Invalid purpose');
  if (input.recipient !== 'qq' && input.recipient !== '163')
    throw new Error('Invalid recipient slot');
  return { action: 'send', purpose: input.purpose, recipient: input.recipient, consent: true };
}

export async function readAction(request: IncomingMessage): Promise<Action> {
  if ('body' in request) {
    const value: unknown = request.body;
    const content = typeof value === 'string' ? value : JSON.stringify(value);
    if (!content || Buffer.byteLength(content) > 1024) throw new Error('Invalid body size');
    return validateAction(JSON.parse(content));
  }
  let content = '';
  for await (const chunk of request) {
    content += String(chunk);
    if (Buffer.byteLength(content) > 1024) throw new Error('Body too large');
  }
  return validateAction(JSON.parse(content));
}

async function connect(user: string, password: string) {
  const transport = nodemailer.createTransport(smtpOptions(user, password));
  const started = performance.now();
  try {
    await transport.verify();
    return {
      status: 'smtp-authenticated',
      sent: false,
      smtpMs: Math.round(performance.now() - started),
    };
  } catch (error: unknown) {
    return {
      status: classify(error),
      sent: false,
      smtpMs: Math.round(performance.now() - started),
    };
  } finally {
    transport.close();
  }
}

export function allowedPost(
  request: Pick<IncomingMessage, 'headers'>,
  deploymentUrl: string,
): boolean {
  return (
    deploymentUrl.length > 0 &&
    request.headers.origin === `https://${deploymentUrl}` &&
    request.headers['x-mail-probe'] === '1' &&
    request.headers['content-type'] === 'application/json'
  );
}

function configuredRecipient(slot: 'qq' | '163'): string {
  const key = { qq: 'MAIL_PROBE_QQ', '163': 'MAIL_PROBE_163' }[slot];
  const address = mailbox(process.env[key] ?? '');
  if (!address.toLowerCase().endsWith(`@${slot}.com`)) throw new Error('Wrong recipient provider');
  return address;
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const requestId = randomUUID();
  if (request.method !== 'POST') return reply(response, 405, { status: 'post-only', requestId });
  if (process.env.VERCEL_ENV !== 'preview' || !allowedPost(request, process.env.VERCEL_URL ?? ''))
    return reply(response, 403, { status: 'request-not-allowed', requestId });
  if (process.env.MAIL_PROBE_ENABLED !== 'yes')
    return reply(response, 503, { status: 'not-configured', requestId, sent: false });
  try {
    const action = await readAction(request);
    const { user, password } = gmailCredentials();
    if (action.action === 'connect')
      return reply(response, 200, { ...(await connect(user, password)), requestId });
    const to = configuredRecipient(action.recipient);
    return reply(response, 200, {
      ...(await deliver(user, to, password, action.purpose)),
      requestId,
    });
  } catch {
    return reply(response, 400, { status: 'invalid-test-configuration-or-request', requestId });
  }
}
