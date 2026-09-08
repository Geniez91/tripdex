import { Injectable } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository.js';
import type {
  TripDexUser,
  VerifiedAuthIdentity,
} from './types/tripdex-user.js';
import { parseRequestedUsername } from './username.js';
import {
  UserIdentityConflictError,
  UserProvisioningError,
} from './user-provisioning.error.js';

@Injectable()
export class UsersService {
  constructor(private readonly users: UserRepository) {}

  async resolveOrCreateUser(
    identity: VerifiedAuthIdentity,
  ): Promise<TripDexUser> {
    const existing = await this.users.findBySupabaseAuthId(
      identity.supabaseAuthId,
    );
    if (existing) return existing;

    const username = parseRequestedUsername(identity.requestedUsername);
    try {
      return await this.users.create({
        supabaseAuthId: identity.supabaseAuthId,
        email: identity.email,
        username,
      });
    } catch (error: unknown) {
      // Concurrent first requests can conflict on any unique field. Re-read
      // only by the verified identity; never attach a user by email/username.
      const concurrentUser = await this.users.findBySupabaseAuthId(
        identity.supabaseAuthId,
      );
      if (concurrentUser) return concurrentUser;
      if (error instanceof UserIdentityConflictError) {
        throw new UserProvisioningError('USER_PROVISIONING_UNAVAILABLE');
      }
      throw error;
    }
  }
}
