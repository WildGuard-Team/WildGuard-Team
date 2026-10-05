import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch {
    // Avoid printing connection strings, which may contain credentials in hosted deployments.
    throw new Error('MongoDB connection failed. Start your local MongoDB service and verify MONGODB_URI in server/.env.');
  }
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export function getDatabaseClient() {
  return mongoose.connection.getClient();
}
