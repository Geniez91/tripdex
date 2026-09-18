import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { UserRepository } from './repositories/user.repository.js';
import { UsersService } from './users.service.js';
import type { IVerifiedAuthIdentity } from './types/tripdex-user.js';
import {
  UserIdentityConflictError,
  UserProvisioningError,
} from './user-provisioning.error.js';

const identity: IVerifiedAuthIdentity = {
  supabaseAuthId: '11111111-1111-4111-8111-111111111111',
  email: 'alice@example.invalid',
  requestedUsername: '  Alice_Paris  ',
};
const alice = {
  id: '22222222-2222-4222-8222-222222222222',
  email: identity.email,
  username: 'alice_paris',
};

async function setup() {
  const findBySupabaseAuthId =
    jest.fn<UserRepository['findBySupabaseAuthId']>();
  const create = jest.fn<UserRepository['create']>();
  const repository = { findBySupabaseAuthId, create } satisfies Pick<
    UserRepository,
    'findBySupabaseAuthId' | 'create'
  >;
  const module = await Test.createTestingModule({
    providers: [
      UsersService,
      { provide: UserRepository, useValue: repository },
    ],
  }).compile();
  return { service: module.get(UsersService), findBySupabaseAuthId, create };
}

describe('UsersService', () => {
  it('resolves the existing business ID without overwriting it from metadata', async () => {
    // Arrange
    const { service, findBySupabaseAuthId, create } = await setup();
    findBySupabaseAuthId.mockResolvedValue(alice);

    // Act
    const user = await service.resolveOrCreateUser({
      ...identity,
      requestedUsername: { userId: 'attacker' },
    });

    // Assert
    expect(user).toEqual(alice);
    expect(user.id).not.toBe(identity.supabaseAuthId);
    expect(findBySupabaseAuthId).toHaveBeenCalledWith(identity.supabaseAuthId);
    expect(create).not.toHaveBeenCalled();
  });

  it('creates with the normalized username chosen by the user', async () => {
    // Arrange
    const { service, findBySupabaseAuthId, create } = await setup();
    findBySupabaseAuthId.mockResolvedValue(null);
    create.mockResolvedValue(alice);

    // Act
    const user = await service.resolveOrCreateUser(identity);

    // Assert
    expect(user).toEqual(alice);
    expect(create).toHaveBeenCalledWith({
      supabaseAuthId: identity.supabaseAuthId,
      email: identity.email,
      username: 'alice_paris',
    });
  });

  it.each([undefined, null])(
    'requires a chosen username when metadata is missing (%s)',
    async (requestedUsername) => {
      // Arrange
      const { service, findBySupabaseAuthId, create } = await setup();
      findBySupabaseAuthId.mockResolvedValue(null);

      // Act
      const provisioning = service.resolveOrCreateUser({
        ...identity,
        requestedUsername,
      });

      // Assert
      await expect(provisioning).rejects.toMatchObject({
        code: 'USERNAME_REQUIRED',
      });
      expect(create).not.toHaveBeenCalled();
    },
  );

  it.each([
    'ab',
    'a'.repeat(31),
    'alice smith',
    '<script>',
    42,
    { username: 'alice' },
  ])('rejects invalid username metadata %#', async (requestedUsername) => {
    // Arrange
    const { service, findBySupabaseAuthId, create } = await setup();
    findBySupabaseAuthId.mockResolvedValue(null);

    // Act
    const provisioning = service.resolveOrCreateUser({
      ...identity,
      requestedUsername,
    });

    // Assert
    await expect(provisioning).rejects.toMatchObject({
      code: 'USERNAME_INVALID',
    });
    expect(create).not.toHaveBeenCalled();
  });

  it.each(['USERNAME_TAKEN', 'ACCOUNT_LINK_CONFLICT'] as const)(
    'reports %s without attaching another account',
    async (code) => {
      // Arrange
      const { service, findBySupabaseAuthId, create } = await setup();
      findBySupabaseAuthId.mockResolvedValue(null);
      create.mockRejectedValue(new UserProvisioningError(code));

      // Act
      const provisioning = service.resolveOrCreateUser(identity);

      // Assert
      await expect(provisioning).rejects.toMatchObject({ code });
      expect(findBySupabaseAuthId.mock.calls).toEqual([
        [identity.supabaseAuthId],
        [identity.supabaseAuthId],
      ]);
    },
  );

  it('resolves concurrent first requests to the same TripDex user', async () => {
    // Arrange
    const { service, findBySupabaseAuthId, create } = await setup();
    findBySupabaseAuthId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(alice);
    create
      .mockResolvedValueOnce(alice)
      .mockRejectedValueOnce(new UserIdentityConflictError());

    // Act
    const users = await Promise.all([
      service.resolveOrCreateUser(identity),
      service.resolveOrCreateUser(identity),
    ]);

    // Assert
    expect(users).toEqual([alice, alice]);
  });

  it('recovers a committed creation whose response was lost', async () => {
    // Arrange
    const { service, findBySupabaseAuthId, create } = await setup();
    findBySupabaseAuthId.mockResolvedValueOnce(null).mockResolvedValue(alice);
    create.mockRejectedValue(
      new UserProvisioningError('USER_PROVISIONING_UNAVAILABLE'),
    );

    // Act
    const user = await service.resolveOrCreateUser(identity);

    // Assert
    expect(user).toEqual(alice);
  });

  it('allows a later retry after a temporary creation failure', async () => {
    // Arrange
    const { service, findBySupabaseAuthId, create } = await setup();
    findBySupabaseAuthId.mockResolvedValue(null);
    create
      .mockRejectedValueOnce(
        new UserProvisioningError('USER_PROVISIONING_UNAVAILABLE'),
      )
      .mockResolvedValueOnce(alice);
    await expect(service.resolveOrCreateUser(identity)).rejects.toMatchObject({
      code: 'USER_PROVISIONING_UNAVAILABLE',
    });

    // Act
    const user = await service.resolveOrCreateUser(identity);

    // Assert
    expect(user).toEqual(alice);
  });

  it('allows a new username after a provisioning conflict', async () => {
    // Arrange
    const { service, findBySupabaseAuthId, create } = await setup();
    findBySupabaseAuthId.mockResolvedValue(null);
    create
      .mockRejectedValueOnce(new UserProvisioningError('USERNAME_TAKEN'))
      .mockResolvedValueOnce({ ...alice, username: 'alice_lyon' });
    await expect(service.resolveOrCreateUser(identity)).rejects.toMatchObject({
      code: 'USERNAME_TAKEN',
    });

    // Act
    const user = await service.resolveOrCreateUser({
      ...identity,
      requestedUsername: 'alice_lyon',
    });

    // Assert
    expect(user.username).toBe('alice_lyon');
    expect(create).toHaveBeenLastCalledWith({
      supabaseAuthId: identity.supabaseAuthId,
      email: identity.email,
      username: 'alice_lyon',
    });
  });
});
