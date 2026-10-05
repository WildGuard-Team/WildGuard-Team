import session from 'express-session';
import MongoStore from 'connect-mongo';

export function createSessionStore(databaseClient, sessionTtlHours) {
  return MongoStore.create({
    clientPromise: Promise.resolve(databaseClient), collectionName: 'sessions',
    ttl: sessionTtlHours * 60 * 60,
  });
}

export function createSessionMiddleware({ sessionSecret, sessionTtlHours, nodeEnv, sessionStore }) {
  return session({
    name: 'wildguard.sid', secret: sessionSecret, resave: false, saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true, sameSite: 'lax', secure: nodeEnv === 'production',
      maxAge: sessionTtlHours * 60 * 60 * 1000,
    },
  });
}
