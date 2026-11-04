import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import argon2 from 'argon2';
import { Admission } from './admission.mjs';
import { PolicyModel, digest, freshToken, originAllowed, pinInput, validPin } from './policy.mjs';

const now = 1804366800000;
test('20 simultaneous hash requests admit 6, reject 14, and never execute more than 2', async () => {
  const gate = new Admission();
  let active = 0;
  let peak = 0;
  const results = await Promise.allSettled(
    Array.from({ length: 20 }, () =>
      gate.run(async () => {
        active++;
        peak = Math.max(peak, active);
        try {
          return await argon2.hash(randomBytes(32), {
            type: argon2.argon2id,
            memoryCost: 19456,
            timeCost: 2,
            parallelism: 1,
          });
        } finally {
          active--;
        }
      }),
    ),
  );
  assert.equal(peak, 2);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 6);
  assert.equal(
    results.filter((result) => result.status === 'rejected' && result.reason.message === 'BUSY')
      .length,
    14,
  );
  assert.equal(gate.active, 0);
  assert.equal(gate.waiting.length, 0);
});
function fixture() {
  const model = new PolicyModel();
  const child = model.addChild('family-A', '小雨', '428716');
  model.addChild('family-B', '小雨', '682415');
  return { model, child };
}

test('duplicate nickname across families requires the correct family', () => {
  const { model } = fixture();
  assert.equal(model.login('family-B', '小雨', '428716', now).status, 401);
  assert.equal(model.login('family-A', '小雨', '428716', now).status, 200);
});
test('family location reveals neither children nor a session, including nonexistent families', () => {
  const { model } = fixture();
  assert.deepEqual(model.locate('family-A'), model.locate('missing'));
  assert.equal(model.sessions.size, 0);
});
test('normalized duplicates inside one family are rejected', () => {
  const { model } = fixture();
  model.addChild('family-A', 'Ａlice', '428716');
  assert.throws(() => model.addChild('family-A', 'alice ', '682415'));
});
test('unknown family, unknown nickname, and wrong PIN share an error shape', () => {
  const { model } = fixture();
  const wrong = model.login('family-A', '小雨', '999999', now);
  assert.deepEqual(model.login('missing', '小雨', '428716', now), wrong);
  assert.deepEqual(model.login('family-A', 'missing', '428716', now), wrong);
});
test('account budget cannot be bypassed by changing source IP', () => {
  const { model } = fixture();
  for (let index = 0; index < 5; index++) assert.equal(model.admit('family-A', '小雨', now), true);
  assert.equal(model.login('family-A', '小雨', '428716', now + 1).status, 429);
  assert.equal(model.admit('family-A', '小雨', now + 900000), true);
});
test('daily account budget survives short-window expiry', () => {
  const { model } = fixture();
  for (let window = 0; window < 4; window++) {
    for (let index = 0; index < 5; index++)
      assert.equal(model.admit('family-A', '小雨', now + window * 900000), true);
  }
  assert.equal(model.admit('family-A', '小雨', now + 3600000), false);
  assert.equal(model.admit('family-A', '小雨', now + 86400000), true);
});
test('parent reset revokes existing sessions, restores attempts and changes PIN', () => {
  const { model, child } = fixture();
  const session = model.login('family-A', '小雨', '428716', now);
  assert.equal(model.authorize(session.token, 'family-A', now), true);
  assert.equal(
    model.reset({ family: 'family-A', verified: true, authenticatedAt: now }, child, '638214', now),
    true,
  );
  assert.equal(model.authorize(session.token, 'family-A', now), false);
  assert.equal(model.login('family-A', '小雨', '428716', now).status, 401);
  assert.equal(model.login('family-A', '小雨', '638214', now).status, 200);
});
test('reset rejects other families, unverified parents and stale reauthentication', () => {
  const { model, child } = fixture();
  for (const parent of [
    { family: 'family-B', verified: true, authenticatedAt: now },
    { family: 'family-A', verified: false, authenticatedAt: now },
    { family: 'family-A', verified: true, authenticatedAt: now - 300000 },
  ])
    assert.equal(model.reset(parent, child, '638214', now), false);
  assert.equal(child.version, 1);
});
test('remembered child session denies another family and expires after 180 idle days', () => {
  const { model } = fixture();
  const session = model.login('family-A', '小雨', '428716', now);
  assert.equal(model.authorize(session.token, 'family-B', now), false);
  assert.equal(model.authorize(session.token, 'family-A', now + 180 * 86400000), false);
});
test('returning children remain signed in beyond seven days and renew without their PIN', () => {
  const { model } = fixture();
  const session = model.login('family-A', '小雨', '428716', now);
  for (const day of [8, 100, 200, 300, 400]) {
    assert.equal(model.authorize(session.token, 'family-A', now + day * 86400000), true);
  }
  assert.equal(model.authorize(session.token, 'family-A', now + 580 * 86400000), false);
});
test('logout rejects the old cookie and stored tokens are hashes', () => {
  const { model } = fixture();
  const session = model.login('family-A', '小雨', '428716', now);
  assert.equal(model.sessions.has(session.token), false);
  assert.equal(model.sessions.has(digest(session.token)), true);
  model.logout(session.token);
  assert.equal(model.authorize(session.token, 'family-A', now), false);
});
test('registration key is single use and cannot mint a second child on replay', () => {
  const { model } = fixture();
  const key = model.issueKey('family-A', now);
  assert.equal(model.redeem(key, '小星', '428716', now).family, 'family-A');
  assert.equal(model.redeem(key, '小月', '682415', now), false);
});
test('reissue revokes previous keys and new keys expire at the exact boundary', () => {
  const { model } = fixture();
  const old = model.issueKey('family-A', now);
  const key = model.issueKey('family-A', now);
  assert.equal(model.redeem(old, '小星', '428716', now), false);
  assert.equal(model.redeem(key, '小星', '428716', now + 86400000), false);
});
test('nickname conflict does not consume the key in the sequential model', () => {
  const { model } = fixture();
  const key = model.issueKey('family-A', now);
  assert.equal(model.redeem(key, '小雨', '428716', now), false);
  assert.equal(model.redeem(key, '小星', '428716', now).family, 'family-A');
});
test('6-digit PIN permits leading zeros but rejects common predictable patterns', () => {
  assert.equal(validPin('028716'), true);
  for (const pin of ['123456', '000000', '654321', '42871', '4287169', '４２８７１６']) {
    assert.equal(validPin(pin), false);
  }
});
test('origin uses exact trusted origin, rejecting missing, null and lookalike origins', () => {
  const origin = 'https://education.example';
  assert.equal(originAllowed(origin, origin), true);
  for (const other of [
    undefined,
    'null',
    'https://education.example.attacker.test',
    'http://education.example',
    'https://education.example/',
  ]) {
    assert.equal(originAllowed(other, origin), false);
  }
});
test('opaque session tokens encode 32 random bytes', () => {
  const first = freshToken();
  assert.equal(Buffer.from(first, 'base64url').length, 32);
  assert.notEqual(first, freshToken());
});
test('real Argon2id verifies peppered PIN; wrong PIN, family or pepper fail', async () => {
  const pepper = randomBytes(32);
  const input = pinInput(pepper, 'family-A', 'child-A', '428716');
  const encoded = await argon2.hash(input, {
    type: argon2.argon2id,
    memoryCost: 32768,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  });
  assert.match(encoded, /^\$argon2id\$v=19\$m=32768,t=3,p=1\$/);
  assert.equal(await argon2.verify(encoded, input), true);
  for (const wrong of [
    pinInput(pepper, 'family-A', 'child-A', '682415'),
    pinInput(pepper, 'family-B', 'child-A', '428716'),
    pinInput(randomBytes(32), 'family-A', 'child-A', '428716'),
  ]) {
    assert.equal(await argon2.verify(encoded, wrong), false);
  }
  const second = await argon2.hash(input, {
    type: argon2.argon2id,
    memoryCost: 32768,
    timeCost: 3,
    parallelism: 1,
  });
  assert.notEqual(encoded, second);
});
