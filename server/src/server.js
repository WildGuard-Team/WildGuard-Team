import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { readConfig } from './config/env.js';
import { connectDatabase, disconnectDatabase, getDatabaseClient, isDatabaseConnected } from './config/database.js';
import MongoStore from 'connect-mongo';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

async function start() {
  const config = readConfig(process.env);
  await connectDatabase(config.mongodbUri);
  const sessionStore = MongoStore.create({
    clientPromise: Promise.resolve(getDatabaseClient()), collectionName: 'sessions',
    ttl: config.sessionTtlHours * 60 * 60,
  });
  const app = createApp({ ...config, isDatabaseConnected, sessionStore });
  const server = app.listen(config.port, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  console.log(`WildGuard API: http://127.0.0.1:${config.port}/api/health`);

  let stopping = false;
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => {
      try { await disconnectDatabase(); process.exitCode = 0; }
      catch { process.exitCode = 1; }
      clearTimeout(timeout);
    });
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(async (error) => {
  console.error(`Startup failed: ${error.message}`);
  await disconnectDatabase();
  process.exitCode = 1;
});
