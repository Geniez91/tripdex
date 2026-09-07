import { Injectable, Module, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../prisma/database.module.js';
import {
  DEVELOPMENT_USER,
  developmentAuthEnabled,
} from './development-user.js';

@Injectable()
export class CurrentUserService {
  constructor(private readonly database: DatabaseService) {}

  async getUserId(): Promise<string> {
    if (!developmentAuthEnabled()) {
      throw new UnauthorizedException('Authentication required.');
    }
    const user = await this.database.client.orm.public.User.where({
      id: DEVELOPMENT_USER.id,
    }).first();
    if (!user) {
      throw new UnauthorizedException(
        'Development user missing. Run npm run db:seed.',
      );
    }
    return user.id;
  }
}

@Module({ providers: [CurrentUserService], exports: [CurrentUserService] })
export class CurrentUserModule {}
