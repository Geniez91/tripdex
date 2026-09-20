import { jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { CurrentUserService } from './current-user.service.js';
import { DEVELOPMENT_USER } from './development-user.js';
import type { DatabaseService } from '../prisma/database.service.js';

describe('CurrentUserService', () => {
  const originalEnvironment = {
    node: process.env.NODE_ENV,
    auth: process.env.DEV_AUTH_ENABLED,
  };
  const first = jest.fn<() => Promise<{ id: string } | null>>();
  const where = jest.fn(() => ({ first }));
  // DatabaseService exposes the complete generated ORM client. Introducing a
  // production port solely for this nested lookup would not improve its boundary.
  const service = new CurrentUserService({
    client: { orm: { public: { User: { where } } } },
  } as unknown as DatabaseService);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.DEV_AUTH_ENABLED = 'true';
  });
  afterAll(() => {
    if (originalEnvironment.node === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment.node;
    if (originalEnvironment.auth === undefined)
      delete process.env.DEV_AUTH_ENABLED;
    else process.env.DEV_AUTH_ENABLED = originalEnvironment.auth;
  });

  it.each(['development', 'test'])(
    'uses only the configured local identity in %s',
    async (environment) => {
      process.env.NODE_ENV = environment;
      first.mockResolvedValue({ id: DEVELOPMENT_USER.id });
      expect(await service.getUserId()).toBe(DEVELOPMENT_USER.id);
      expect(where).toHaveBeenCalledWith({ id: DEVELOPMENT_USER.id });
    },
  );
  it('rejects a missing seeded user', async () => {
    first.mockResolvedValue(null);
    await expect(service.getUserId()).rejects.toThrow(UnauthorizedException);
  });
  it.each(['production', 'staging', '', undefined])(
    'rejects development auth in environment %s',
    async (environment) => {
      if (environment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = environment;
      await expect(service.getUserId()).rejects.toThrow(UnauthorizedException);
      expect(where).not.toHaveBeenCalled();
    },
  );
  it('requires explicit opt-in', async () => {
    delete process.env.DEV_AUTH_ENABLED;
    await expect(service.getUserId()).rejects.toThrow(UnauthorizedException);
    expect(where).not.toHaveBeenCalled();
  });
});
