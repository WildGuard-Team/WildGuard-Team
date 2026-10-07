import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { connectDatabase, disconnectDatabase } from '../../../config/database.js';
import { REPORTING_DATASET_ID } from '../config/reporting-data.constants.js';
import { createReportingSeedRepository } from '../repositories/reporting-seed.repository.js';
import { seedReportingData } from '../services/seed-reporting-data.service.js';

dotenv.config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });

async function run() {
  const mongodbUri = process.env.MONGODB_URI?.trim();
  if (!mongodbUri) throw new Error('Missing MONGODB_URI in server/.env.');

  await connectDatabase(mongodbUri);
  try {
    const result = await seedReportingData(createReportingSeedRepository());
    console.log(`Reporting seed ${REPORTING_DATASET_ID} synchronized.`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await disconnectDatabase();
  }
}

run().catch((error) => {
  console.error(`Reporting seed failed: ${error.message}`);
  process.exitCode = 1;
});
