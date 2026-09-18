import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ITripDexUser } from '../../users/types/tripdex-user.js';
import { authenticatedUser } from '../auth-request.js';
import type { IAuthRequest } from '../auth-request.js';

export const CurrentUser = createParamDecorator<undefined, ITripDexUser>(
  (_data: undefined, context: ExecutionContext): ITripDexUser => {
    const user = context.switchToHttp().getRequest<IAuthRequest>()[
      authenticatedUser
    ];
    if (!user) throw new UnauthorizedException();
    return user;
  },
);
