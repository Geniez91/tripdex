import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { TripDexUser } from '../../users/types/tripdex-user.js';
import { authenticatedUser } from '../auth-request.js';
import type { AuthRequest } from '../auth-request.js';

export const CurrentUser = createParamDecorator<undefined, TripDexUser>(
  (_data: undefined, context: ExecutionContext): TripDexUser => {
    const user = context.switchToHttp().getRequest<AuthRequest>()[
      authenticatedUser
    ];
    if (!user) throw new UnauthorizedException();
    return user;
  },
);
