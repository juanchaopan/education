import { createApplication } from './application.js';
import { readConfig } from './shared/config.js';

const config = readConfig();
const app = await createApplication();
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    void app.close();
  });
}
await app.listen({ port: config.port, host: config.host });
