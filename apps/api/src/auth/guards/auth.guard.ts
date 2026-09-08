import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { UsersService } from '../../users/users.service.js';
import { authenticatedUser } from '../auth-request.js';
import type { AuthRequest } from '../auth-request.js';
import { authHttpError } from '../auth-http-error.js';
import { SupabaseAuthService } from '../supabase-auth.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: SupabaseAuthService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    delete request[authenticatedUser];
    const authorization = request.headers.authorization;
    const match =
      typeof authorization === 'string'
        ? /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/i.exec(authorization)
        : null;
    if (!match)
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Authentication required.',
      });
    try {
      const identity = await this.auth.verifyAccessToken(match[1]);
      request[authenticatedUser] =
        await this.users.resolveOrCreateUser(identity);
      return true;
    } catch (error: unknown) {
      throw authHttpError(error);
    }
  }
}
