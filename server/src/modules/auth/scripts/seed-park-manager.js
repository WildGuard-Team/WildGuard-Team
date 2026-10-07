import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { connectDatabase, disconnectDatabase } from '../../../config/database.js';
import { createParkManagerSeedRepository } from '../repositories/park-manager-seed.repository.js';
import { seedParkManager } from '../services/seed-park-manager.service.js';

dotenv.config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });

const FIXED_MANAGER_ACCOUNT = Object.freeze({
  fullName: 'WildGuard Park Manager',
  email: 'parkmanager@wildguard.lk',
  password: 'Manager@123',
});

async function run() {
  const mongodbUri = process.env.MONGODB_URI?.trim();
  if (!mongodbUri) throw new Error('Missing MONGODB_URI in server/.env.');

  await connectDatabase(mongodbUri);
  try {
    const result = await seedParkManager(
      createParkManagerSeedRepository(),
      FIXED_MANAGER_ACCOUNT,
    );
    console.log(`Park Manager account ${result.action}: ${result.email}`);
  } finally {
    await disconnectDatabase();
  }
}

run().catch((error) => {
  console.error(`Park Manager seed failed: ${error.message}`);
  process.exitCode = 1;
});
