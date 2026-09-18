import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { UsersService } from '../../users/users.service.js';
import { AuthGuard } from './auth.guard.js';
import { SupabaseAuthService } from '../supabase-auth.service.js';
import { AuthVerificationError } from '../auth.error.js';
import { authenticatedUser } from '../auth-request.js';
import type { IAuthRequest } from '../auth-request.js';

async function setup(authorization?: string | string[]) {
  const verifyAccessToken = jest.fn<SupabaseAuthService['verifyAccessToken']>();
  const resolveOrCreateUser = jest.fn<UsersService['resolveOrCreateUser']>();
  const module = await Test.createTestingModule({
    providers: [
      AuthGuard,
      { provide: SupabaseAuthService, useValue: { verifyAccessToken } },
      { provide: UsersService, useValue: { resolveOrCreateUser } },
    ],
  }).compile();
  const request: IAuthRequest = { headers: { authorization } };
  return {
    guard: module.get(AuthGuard),
    request,
    context: new ExecutionContextHost([request]),
    verifyAccessToken,
    resolveOrCreateUser,
  };
}

describe('AuthGuard', () => {
  it.each([
    undefined,
    'Basic abc',
    'Bearer',
    'Bearer ',
    'Bearer a b',
    'Bearer a,Bearer b',
    ['Bearer a', 'Bearer b'],
  ])(
    'rejects malformed Authorization %# before verification or provisioning',
    async (header) => {
      // Arrange
      const { guard, context, verifyAccessToken, resolveOrCreateUser } =
        await setup(header);

      // Act
      const authentication = guard.canActivate(context);

      // Assert
      await expect(authentication).rejects.toMatchObject({ status: 401 });
      expect(verifyAccessToken).not.toHaveBeenCalled();
      expect(resolveOrCreateUser).not.toHaveBeenCalled();
    },
  );

  it('attaches only the resolved TripDex user after verified authentication', async () => {
    // Arrange
    const { guard, context, request, verifyAccessToken, resolveOrCreateUser } =
      await setup('Bearer access-token');
    const identity = {
      supabaseAuthId: 'auth-id',
      email: 'alice@example.invalid',
      requestedUsername: 'alice',
    };
    const user = { id: 'tripdex-id', email: identity.email, username: 'alice' };
    verifyAccessToken.mockResolvedValue(identity);
    resolveOrCreateUser.mockResolvedValue(user);

    // Act
    const allowed = await guard.canActivate(context);

    // Assert
    expect(allowed).toBe(true);
    expect(verifyAccessToken).toHaveBeenCalledWith('access-token');
    expect(resolveOrCreateUser).toHaveBeenCalledWith(identity);
    expect(request[authenticatedUser]).toEqual(user);
  });

  it.each([
    ['AUTH_INVALID', 401],
    ['AUTH_UNAVAILABLE', 503],
  ] as const)('rejects %s without provisioning', async (code, status) => {
    // Arrange
    const { guard, context, request, verifyAccessToken, resolveOrCreateUser } =
      await setup('Bearer access-token');
    verifyAccessToken.mockRejectedValue(new AuthVerificationError(code));

    // Act
    const authentication = guard.canActivate(context);

    // Assert
    await expect(authentication).rejects.toMatchObject({ status });
    expect(resolveOrCreateUser).not.toHaveBeenCalled();
    expect(request[authenticatedUser]).toBeUndefined();
  });
});
