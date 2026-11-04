import { createHash, createHmac, randomBytes } from 'node:crypto';

// In-memory specification model only. It proves no database or HTTP behavior.
export const normalizeNickname = (value) => value.normalize('NFKC').trim().toLowerCase();
export const digest = (value) => createHash('sha256').update(value).digest('hex');
export const pinInput = (pepper, family, child, pin) =>
  createHmac('sha256', pepper)
    .update(JSON.stringify(['pin-v1', family, child, pin]))
    .digest();
export const freshToken = () => randomBytes(32).toString('base64url');
export const validPin = (value) =>
  /^[0-9]{6}$/.test(value) &&
  !/^([0-9])\1{5}$/.test(value) &&
  ![
    '012345',
    '123456',
    '234567',
    '345678',
    '456789',
    '987654',
    '876543',
    '765432',
    '654321',
    '543210',
  ].includes(value);

export function originAllowed(origin, expected) {
  if (!origin || origin === 'null') return false;
  try {
    return new URL(origin).origin === expected && origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

export class PolicyModel {
  children = new Map();
  sessions = new Map();
  keys = new Map();
  attempts = new Map();
  addChild(family, nickname, pin) {
    const id = `${family}:${normalizeNickname(nickname)}`;
    if (this.children.has(id)) throw new Error('Duplicate nickname');
    const child = { id, family, nickname: normalizeNickname(nickname), pin, version: 1 };
    this.children.set(id, child);
    return child;
  }
  find(family, nickname) {
    return this.children.get(`${family}:${normalizeNickname(nickname)}`);
  }
  locate() {
    return { instruction: '请输入昵称和六位数字密码' };
  }
  admit(family, nickname, now) {
    const key = `${family}:${normalizeNickname(nickname)}`;
    const recent = (this.attempts.get(key) ?? []).filter((at) => at > now - 86400000);
    if (recent.length >= 20 || recent.filter((at) => at > now - 900000).length >= 5) return false;
    this.attempts.set(key, [...recent, now]);
    return true;
  }
  login(family, nickname, pin, now) {
    if (!this.admit(family, nickname, now)) return { status: 429, code: 'TRY_LATER' };
    const child = this.find(family, nickname);
    if (!child || child.pin !== pin) return { status: 401, code: 'INVALID_CREDENTIALS' };
    const token = freshToken();
    this.sessions.set(digest(token), {
      child: child.id,
      family,
      version: child.version,
      created: now,
      seen: now,
    });
    return { status: 200, token };
  }
  authorize(token, family, now) {
    const session = this.sessions.get(digest(token));
    if (!session || session.family !== family) return false;
    const child = this.children.get(session.child);
    return (
      child?.version === session.version &&
      now < session.created + 7 * 86400000 &&
      now < session.seen + 86400000
    );
  }
  reset(parent, child, pin, now) {
    if (
      !parent.verified ||
      parent.family !== child.family ||
      now - parent.authenticatedAt >= 300000 ||
      now < parent.authenticatedAt
    )
      return false;
    child.pin = pin;
    child.version++;
    this.attempts.delete(child.id);
    return true;
  }
  logout(token) {
    this.sessions.delete(digest(token));
  }
  issueKey(family, now) {
    for (const record of this.keys.values()) if (record.family === family) record.revoked = true;
    const token = freshToken();
    this.keys.set(digest(token), { family, expires: now + 86400000, used: false, revoked: false });
    return token;
  }
  redeem(token, nickname, pin, now) {
    const record = this.keys.get(digest(token));
    if (!record || record.used || record.revoked || now >= record.expires) return false;
    if (this.find(record.family, nickname)) return false;
    const child = this.addChild(record.family, nickname, pin);
    record.used = true;
    return child;
  }
}
