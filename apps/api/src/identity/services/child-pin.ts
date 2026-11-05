import { createHmac } from 'node:crypto';
import { hashParentPassword } from './password.js';

export function createChildPin(pepper: string) {
  const material = createPinMaterial(pepper);
  return (family: string, child: string, pin: string) =>
    hashParentPassword(material(family, child, pin));
}

export function createPinMaterial(pepper: string) {
  if (!/^[a-fA-F0-9]{64}$/.test(pepper))
    throw new Error('PIN_PEPPER must contain 64 hexadecimal characters');
  const secret = Buffer.from(pepper, 'hex');
  return (family: string, child: string, pin: string) =>
    createHmac('sha256', secret)
      .update(JSON.stringify([1, family, child, pin]))
      .digest('base64url');
}
