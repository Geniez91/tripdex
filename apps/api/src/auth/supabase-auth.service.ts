import { Injectable } from '@nestjs/common';
import { AuthClient } from '@supabase/auth-js';
import type { IVerifiedAuthIdentity } from '../users/types/tripdex-user.js';
import { AuthVerificationError } from './auth.error.js';

@Injectable()
export class SupabaseAuthService {
  private client: InstanceType<typeof AuthClient> | undefined;

  private getClient(): InstanceType<typeof AuthClient> {
    if (this.client) return this.client;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new AuthVerificationError('AUTH_UNAVAILABLE');
    this.client = new AuthClient({
      url: `${url.replace(/\/$/, '')}/auth/v1`,
      headers: { apikey: key },
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      fetch: async (input, init) => {
        try {
          return await fetch(input, {
            ...init,
            signal: AbortSignal.timeout(10_000),
          });
        } catch {
          // Keep transport exception details out of SDK logging and HTTP output.
          return Response.json(
            { code: 'unexpected_failure', message: 'Auth unavailable' },
            { status: 503 },
          );
        }
      },
    });
    return this.client;
  }

  async verifyAccessToken(accessToken: string): Promise<IVerifiedAuthIdentity> {
    try {
      const { data, error } = await this.getClient().getUser(accessToken);
      if (error) {
        const rejected = [
          'bad_jwt',
          'session_expired',
          'session_not_found',
          'user_not_found',
          'user_banned',
          'no_authorization',
        ].includes(error.code ?? '');
        throw new AuthVerificationError(
          rejected || error.status === 401 || error.status === 403
            ? 'AUTH_INVALID'
            : 'AUTH_UNAVAILABLE',
        );
      }
      const user = data.user;
      if (
        !user ||
        user.is_anonymous ||
        !user.email ||
        !user.email_confirmed_at ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          user.id,
        )
      ) {
        throw new AuthVerificationError('AUTH_INVALID');
      }
      const requestedUsername: unknown = user.user_metadata?.username;
      return { supabaseAuthId: user.id, email: user.email, requestedUsername };
    } catch (error: unknown) {
      if (error instanceof AuthVerificationError) throw error;
      throw new AuthVerificationError('AUTH_UNAVAILABLE');
    }
  }
}
