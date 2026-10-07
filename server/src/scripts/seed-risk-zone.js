import "dotenv/config";

import { connectDatabase, disconnectDatabase } from "../config/database.js";

import { readConfig } from "../config/env.js";

import { seedRiskZone } from "../modules/monitoring/seeds/risk-zone.seed.js";

async function run() {
  try {
    const config = readConfig(process.env);

    await connectDatabase(config.mongodbUri);

    const zones = await seedRiskZone();

    console.log(`Risk zones seeded successfully: ${zones.length}`);

    for (const zone of zones) {
      console.log(
        `- ${zone.name} | ${zone.severity} | ` +
          `${zone.center.latitude}, ${zone.center.longitude} | ` +
          `${zone.radiusMeters}m`,
      );
    }
  } catch (error) {
    console.error("Risk zone seed failed:", error.message);

    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

run();
