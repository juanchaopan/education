import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export function createMailPayload(secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(secret))
    throw new Error('MAIL_PAYLOAD_KEY must be 32 random bytes in hex');
  const key = Buffer.from(secret, 'hex');
  return {
    seal: (id: string, token: string) => {
      const nonce = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, nonce);
      cipher.setAAD(Buffer.from(id));
      const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
      return Buffer.concat([nonce, cipher.getAuthTag(), data]).toString('base64url');
    },
    open: (id: string, sealed: string) => {
      const data = Buffer.from(sealed, 'base64url');
      const cipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
      cipher.setAuthTag(data.subarray(12, 28));
      cipher.setAAD(Buffer.from(id));
      return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString('utf8');
    },
  };
}
