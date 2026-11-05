import { verificationEmail } from './verification-email.js';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { SMTPServer } from 'smtp-server';
import nodemailer from 'nodemailer';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createGmailSender } from './gmail.js';
let directory: string, key: Buffer, cert: Buffer;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'education-smtp-'));
  await promisify(execFile)('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '1',
    '-keyout',
    join(directory, 'key.pem'),
    '-out',
    join(directory, 'cert.pem'),
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost',
  ]);
  key = await readFile(join(directory, 'key.pem'));
  cert = await readFile(join(directory, 'cert.pem'));
});
afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});
it.each([
  ['auth', 'authorization-failed'],
  ['temporary', 'retryable'],
  ['permanent', 'rejected'],
  ['data-reject', 'retryable'],
  ['data-disconnect', 'unknown'],
  ['accept', 'accepted'],
])(
  'classifies a real TLS SMTP %s response without treating acceptance as verification',
  async (mode, outcome) => {
    const chunks: Buffer[] = [];
    const server = new SMTPServer({
      secure: true,
      key,
      cert,
      logger: false,
      onAuth: (_auth, _session, callback) =>
        mode === 'auth'
          ? callback(Object.assign(new Error('fixture auth revoked'), { responseCode: 535 }))
          : callback(null, { user: 'test' }),
      onRcptTo: (_address, _session, callback) => {
        if (mode === 'temporary' || mode === 'permanent')
          callback(
            Object.assign(new Error('fixture rejection'), {
              responseCode: mode === 'temporary' ? 421 : 550,
            }),
          );
        else callback();
      },
      onData: (stream, _session, callback) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => {
          if (mode === 'data-disconnect') {
            for (const connection of server.connections) connection._socket.destroy();
            return;
          }
          if (mode === 'data-reject')
            callback(
              Object.assign(new Error('fixture temporary rejection'), { responseCode: 451 }),
            );
          else callback();
        });
      },
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.server.address() as AddressInfo).port;
    const sender = createGmailSender(
      { user: 'sender@gmail.com', password: 'test' },
      (token) => verificationEmail('https://school.example', token),
      () =>
        nodemailer.createTransport({
          host: '127.0.0.1',
          port,
          secure: true,
          auth: { user: 'test', pass: 'test' },
          tls: { ca: cert, servername: 'localhost', rejectUnauthorized: true },
          socketTimeout: 500,
        }),
    );
    try {
      expect(await sender.send('recipient@example.test', 'a'.repeat(43))).toBe(outcome);
      if (mode === 'accept') {
        const message = Buffer.concat(chunks).toString();
        expect(message).toContain('Content-Type: multipart/alternative;');
        expect(message).toContain('Content-Type: text/plain; charset=utf-8');
        expect(message).toContain('Content-Type: text/html; charset=utf-8');
      }
    } finally {
      await new Promise<void>((resolve) => server.close(resolve));
    }
  },
  15000,
);
