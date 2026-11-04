import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import nodemailer from 'nodemailer';
import { classify, mailbox, message, smtpOptions } from './probe.mts';

test('real MIME encoder produces UTF-8 multipart verify and reset emails without network', async () => {
  const transport = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'windows',
  });
  for (const purpose of ['verify', 'reset'] as const) {
    const mail = message(
      'sender@example.invalid',
      'recipient@example.invalid',
      purpose,
      '0123456789abcdef',
    );
    const info = await transport.sendMail(mail);
    assert.ok(Buffer.isBuffer(info.message));
    const mime = info.message.toString('utf8');
    assert.match(mime, /multipart\/alternative/);
    assert.match(mime, /text\/plain; charset=utf-8/);
    assert.match(mime, /text\/html; charset=utf-8/);
    assert.match(mime, /Subject: =\?UTF-8\?B\?/i);
    assert.deepEqual(info.envelope.to, ['recipient@example.invalid']);
    assert.match(
      String(mail.text),
      /https:\/\/education-access-spike\.hyp\.app\/\?mail_probe=0123456789abcdef/,
    );
    assert.match(String(mail.text), /不是有效的账号操作链接/);
  }
});

test('rejects recipient/header injection and multiple recipients', () => {
  for (const address of [
    'a@qq.com\r\nBcc: victim@example.invalid',
    'a@qq.com,b@163.com',
    'Name <a@qq.com>',
    ' a@qq.com',
  ]) {
    assert.throws(() => mailbox(address));
  }
});

test('cannot inject another link, purpose or HTML through probe identifier', () => {
  assert.throws(() =>
    message('a@example.invalid', 'b@example.invalid', 'verify', 'https://evil.invalid'),
  );
  assert.throws(() => message('a@example.invalid', 'b@example.invalid', 'verify', '<img src=x>'));
});

test('requires Gmail sender, app password, authenticated TLS and bounded socket timeouts', () => {
  assert.throws(() => smtpOptions('a@example.invalid', 'abcdefghijklmnop'));
  assert.throws(() => smtpOptions('a@gmail.com', 'ordinary-password'));
  const options = smtpOptions('a@gmail.com', 'abcdefghijklmnop');
  assert.equal(options.host, 'smtp.gmail.com');
  assert.equal(options.port, 465);
  assert.equal(options.secure, true);
  assert.equal(options.tls?.rejectUnauthorized, true);
  assert.equal(options.tls?.minVersion, 'TLSv1.2');
  assert.equal(options.logger, false);
  assert.equal(options.debug, false);
  assert.equal(options.socketTimeout, 10000);
});

test('distinguishes authentication, explicit rejection and uncertain delivery without retrying', () => {
  assert.equal(classify({ code: 'EAUTH', responseCode: 535 }), 'auth-or-policy');
  assert.equal(classify({ responseCode: 421 }), 'temporary-rejection');
  assert.equal(classify({ responseCode: 550 }), 'permanent-rejection');
  assert.equal(classify({ code: 'ETIMEDOUT', command: 'DATA' }), 'unknown-delivery');
});

test('default CLI is offline and does not reveal supplied personal data or secret', () => {
  const result = spawnSync(process.execPath, ['probe.mts'], {
    cwd: import.meta.dirname,
    encoding: 'utf8',
    env: {
      ...process.env,
      GMAIL_USER: 'a@gmail.com',
      GMAIL_APP_PASSWORD: 'abcdefghijklmnop',
      MAIL_PROBE_TO: 'a@qq.com',
    },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).sent, false);
  assert.doesNotMatch(result.stdout + result.stderr, /a@(gmail|qq)\.com|abcdefghijklmnop/);
});

test('live CLI refuses an unconfirmed recipient before any SMTP connection', () => {
  const result = spawnSync(process.execPath, ['probe.mts', '--send'], {
    cwd: import.meta.dirname,
    encoding: 'utf8',
    env: {
      ...process.env,
      GMAIL_USER: 'a@gmail.com',
      GMAIL_APP_PASSWORD: 'abcdefghijklmnop',
      MAIL_PROBE_TO: 'a@qq.com',
      MAIL_PROBE_CONFIRM_TO: '',
    },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout + result.stderr, /a@(gmail|qq)\.com|abcdefghijklmnop/);
});
