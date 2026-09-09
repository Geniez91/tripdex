import { UserProvisioningError } from './user-provisioning.error.js';

export function parseRequestedUsername(requestedUsername: unknown): string {
  if (requestedUsername === undefined || requestedUsername === null) {
    throw new UserProvisioningError('USERNAME_REQUIRED');
  }
  if (typeof requestedUsername !== 'string') {
    throw new UserProvisioningError('USERNAME_INVALID');
  }
  const username = requestedUsername.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    throw new UserProvisioningError('USERNAME_INVALID');
  }
  return username;
}
