import * as argon2 from 'argon2';

const options: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 32768,
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
};
export async function probe(password: Buffer): Promise<boolean> {
  const encoded: string = await argon2.hash(password, options);
  return argon2.verify(encoded, password);
}
