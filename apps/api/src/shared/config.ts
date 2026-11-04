import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

const schema = Type.Object({
  port: Type.Integer({ minimum: 1, maximum: 65535 }),
  host: Type.String({ minLength: 1 }),
  paidAiEnabled: Type.Boolean(),
});

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const config = {
    port: Number(env.PORT ?? 3001),
    host: env.HOST ?? '127.0.0.1',
    paidAiEnabled: env.PAID_AI_ENABLED !== 'false',
  };
  if (!Value.Check(schema, config)) throw new Error('Invalid application configuration');
  if (env.PAID_AI_ENABLED && !['true', 'false'].includes(env.PAID_AI_ENABLED)) {
    throw new Error('PAID_AI_ENABLED must be true or false');
  }
  return config;
}
