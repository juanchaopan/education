import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/deletion-ledger-schema.ts',
  out: './drizzle-ledger',
});
