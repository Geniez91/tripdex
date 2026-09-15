import {
  ConflictException,
  HttpException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
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
        return new UnprocessableEntityException({
          code: error.code,
          message: 'Choose a valid username.',
        });
      case 'USERNAME_TAKEN':
        return new ConflictException({
          code: error.code,
          message: 'Choose another username.',
        });
      case 'ACCOUNT_LINK_CONFLICT':
        return new ConflictException({
          code: error.code,
          message: 'Account provisioning requires assistance.',
        });
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
