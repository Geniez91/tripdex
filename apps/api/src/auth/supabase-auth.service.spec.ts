import { jest } from '@jest/globals';
import { SupabaseAuthService } from './supabase-auth.service.js';

const verifiedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'alice@example.invalid',
  email_confirmed_at: '2026-09-01T00:00:00Z',
  is_anonymous: false,
  user_metadata: { username: 'Alice', userId: 'attacker', role: 'admin' },
};

describe('SupabaseAuthService', () => {
  beforeEach(() => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      SUPABASE_URL: 'https://auth.example.invalid',
      SUPABASE_SERVICE_ROLE_KEY: 'test-only-key',
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('verifies the access token with the configured project and extracts only identity fields', async () => {
    // Arrange
    const transport = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json(verifiedUser));
    const service = new SupabaseAuthService();

    // Act
    const identity = await service.verifyAccessToken('test-access-token');

    // Assert
    expect(identity).toEqual({
      supabaseAuthId: verifiedUser.id,
      email: verifiedUser.email,
      requestedUsername: 'Alice',
    });
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, options] = transport.mock.calls[0];
    expect(url).toBe('https://auth.example.invalid/auth/v1/user');
    expect(new Headers(options?.headers).get('Authorization')).toBe(
      'Bearer test-access-token',
    );
    expect(options?.body).toBeUndefined();
  });

  it.each(['bad_jwt', 'session_expired'])(
    'encapsulates rejected tokens (%s)',
    async (code) => {
      // Arrange
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          Response.json({ code, message: 'internal details' }, { status: 401 }),
        );
      const service = new SupabaseAuthService();

      // Act
      const verification = service.verifyAccessToken('rejected-token');

      // Assert
      await expect(verification).rejects.toMatchObject({
        code: 'AUTH_INVALID',
        message: 'AUTH_INVALID',
      });
    },
  );

  it.each([429, 500, 503])(
    'maps provider status %s to unavailable',
    async (status) => {
      // Arrange
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          Response.json({ message: 'internal details' }, { status }),
        );
      const service = new SupabaseAuthService();

      // Act
      const verification = service.verifyAccessToken('test-token');

      // Assert
      await expect(verification).rejects.toMatchObject({
        code: 'AUTH_UNAVAILABLE',
        message: 'AUTH_UNAVAILABLE',
      });
    },
  );

  it('masks transport failures without logging their details', async () => {
    // Arrange
    jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('sensitive transport details'));
    const logging = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const service = new SupabaseAuthService();

    // Act
    const verification = service.verifyAccessToken('test-token');

    // Assert
    await expect(verification).rejects.toMatchObject({
      code: 'AUTH_UNAVAILABLE',
    });
    expect(logging).not.toHaveBeenCalled();
  });

  it('preserves non-string username metadata as untrusted input', async () => {
    // Arrange
    const username = { role: 'admin' };
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json({ ...verifiedUser, user_metadata: { username } }),
      );
    const service = new SupabaseAuthService();

    // Act
    const identity = await service.verifyAccessToken('test-token');

    // Assert
    expect(identity.requestedUsername).toEqual(username);
    expect(identity.supabaseAuthId).toBe(verifiedUser.id);
  });

  it.each([
    { is_anonymous: true },
    { email: '' },
    { email_confirmed_at: null },
  ])('rejects unsuitable verified accounts %#', async (fields) => {
    // Arrange
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ ...verifiedUser, ...fields }));
    const service = new SupabaseAuthService();

    // Act
    const verification = service.verifyAccessToken('test-token');

    // Assert
    await expect(verification).rejects.toMatchObject({ code: 'AUTH_INVALID' });
  });

  it('fails safely when server configuration is missing', async () => {
    // Arrange
    delete process.env.SUPABASE_URL;
    const transport = jest.spyOn(globalThis, 'fetch');
    const service = new SupabaseAuthService();

    // Act
    const verification = service.verifyAccessToken('test-token');

    // Assert
    await expect(verification).rejects.toMatchObject({
      code: 'AUTH_UNAVAILABLE',
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it('keeps access tokens separate across concurrent requests on the same client', async () => {
    // Arrange
    const transport = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((_url, options) => {
        const first =
          new Headers(options?.headers).get('Authorization') ===
          'Bearer first-token';
        return Promise.resolve(
          Response.json({
            ...verifiedUser,
            id: first
              ? verifiedUser.id
              : '22222222-2222-4222-8222-222222222222',
          }),
        );
      });
    const service = new SupabaseAuthService();

    // Act
    const identities = await Promise.all([
      service.verifyAccessToken('first-token'),
      service.verifyAccessToken('second-token'),
    ]);

    // Assert
    expect(identities.map((identity) => identity.supabaseAuthId)).toEqual([
      verifiedUser.id,
      '22222222-2222-4222-8222-222222222222',
    ]);
    expect(transport).toHaveBeenCalledTimes(2);
  });
});
