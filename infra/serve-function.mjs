import { createServer } from 'node:http';
import handler from '../api/index.mjs';

// Local integration host for the same request handler deployed to Vercel.
createServer(handler).listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
