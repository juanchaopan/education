import { hash, argon2id } from 'argon2';

export function hashParentPassword(password: string) {
  return hash(password, {
    type: argon2id,
    memoryCost: 32768,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  });
}
