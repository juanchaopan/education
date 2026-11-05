import { createHmac } from 'node:crypto';
import { hashParentPassword, verifyParentPassword } from './password.js';
import { RequestError } from '../../shared/request-error.js';

export function createChildPin(pepper: string) {
  const material = createPinMaterial(pepper);
  return (family: string, child: string, pin: string) =>
    hashParentPassword(material(family, child, pin));
}

export function createReplacementPin(pepper: string) {
  const material = createPinMaterial(pepper);
  return async (family: string, child: string, pin: string, currentHash: string) => {
    const candidate = material(family, child, pin);
    if (await verifyParentPassword(currentHash, candidate))
      throw new RequestError(400, '请设置一个与旧 PIN 不同的新 PIN。');
    return hashParentPassword(candidate);
  };
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
