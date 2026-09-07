import { jest } from '@jest/globals';

// Unit/HTTP tests replace only the database boundary. The real Prisma runtime
// is exercised by database.integration.mjs under Node, outside Jest's VM realm.
jest.unstable_mockModule('../src/prisma/db.js', () => ({
  db: { close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) },
}));
