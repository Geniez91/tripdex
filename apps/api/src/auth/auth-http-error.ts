import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserProvisioningError } from '../users/user-provisioning.error.js';
import { AuthVerificationError } from './auth.error.js';

export function authHttpError(error: unknown): HttpException {
  if (error instanceof AuthVerificationError) {
    return error.code === 'AUTH_INVALID'
      ? new UnauthorizedException({
          code: error.code,
          message: 'Authentication required.',
        })
      : new ServiceUnavailableException({
          code: error.code,
          message: 'Authentication temporarily unavailable.',
        });
  }
  if (error instanceof UserProvisioningError) {
    switch (error.code) {
      case 'USERNAME_REQUIRED':
      case 'USERNAME_INVALID':
        return new HttpException(
          { code: error.code, message: 'Choose a valid username.' },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      case 'USERNAME_TAKEN':
        return new HttpException(
          { code: error.code, message: 'Choose another username.' },
          HttpStatus.CONFLICT,
        );
      case 'ACCOUNT_LINK_CONFLICT':
        return new HttpException(
          {
            code: error.code,
            message: 'Account provisioning requires assistance.',
          },
          HttpStatus.CONFLICT,
        );
      case 'USER_PROVISIONING_UNAVAILABLE':
        return new ServiceUnavailableException({
          code: error.code,
          message: 'Account provisioning temporarily unavailable.',
        });
    }
  }
  return new ServiceUnavailableException({
    code: 'AUTH_UNAVAILABLE',
    message: 'Authentication temporarily unavailable.',
  });
}
