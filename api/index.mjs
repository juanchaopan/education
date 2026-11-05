import { createApplication } from '../apps/api/dist/application.js';

// Keep the request stream intact for Fastify's schema validation and body limits.
export const config = { api: { bodyParser: false } };
const app = await createApplication();
await app.ready();

export default function handler(request, response) {
  app.server.emit('request', request, response);
}
