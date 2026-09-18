import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../prisma/database.service.js';
import type { INewTripDexUser, ITripDexUser } from '../types/tripdex-user.js';
import {
  UserIdentityConflictError,
  UserProvisioningError,
} from '../user-provisioning.error.js';

function uniqueConstraint(error: unknown): string | undefined {
  const visited = new Set<unknown>();
  let current = error;
  while (
    current !== null &&
    typeof current === 'object' &&
    !visited.has(current)
  ) {
    visited.add(current);
    if (
      'sqlState' in current &&
      current.sqlState === '23505' &&
      'constraint' in current &&
      typeof current.constraint === 'string'
    ) {
      return current.constraint;
    }
    current = 'cause' in current ? current.cause : undefined;
  }
  return undefined;
}

@Injectable()
export class UserRepository {
  constructor(private readonly database: DatabaseService) {}

  async findBySupabaseAuthId(
    supabaseAuthId: string,
  ): Promise<ITripDexUser | null> {
    try {
      return await this.database.client.orm.public.User.where({
        supabaseAuthId,
      })
        .select('id', 'email', 'username')
        .first();
    } catch {
      throw new UserProvisioningError('USER_PROVISIONING_UNAVAILABLE');
    }
  }

  async create(input: INewTripDexUser): Promise<ITripDexUser> {
    try {
      const user = await this.database.client.orm.public.User.create({
        supabaseAuthId: input.supabaseAuthId,
        email: input.email,
        username: input.username,
      });
      return { id: user.id, email: user.email, username: user.username };
    } catch (error: unknown) {
      switch (uniqueConstraint(error)) {
        case 'user_supabaseAuthId_key':
          throw new UserIdentityConflictError();
        case 'user_username_key':
          throw new UserProvisioningError('USERNAME_TAKEN');
        case 'user_email_key':
          throw new UserProvisioningError('ACCOUNT_LINK_CONFLICT');
        default:
          throw new UserProvisioningError('USER_PROVISIONING_UNAVAILABLE');
      }
    }
  }
}
