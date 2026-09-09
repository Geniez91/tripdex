export type UserProvisioningCode =
  | 'USERNAME_REQUIRED'
  | 'USERNAME_INVALID'
  | 'USERNAME_TAKEN'
  | 'ACCOUNT_LINK_CONFLICT'
  | 'USER_PROVISIONING_UNAVAILABLE';

export class UserProvisioningError extends Error {
  constructor(readonly code: UserProvisioningCode) {
    super(code);
    this.name = 'UserProvisioningError';
  }
}

export class UserIdentityConflictError extends Error {
  constructor() {
    super('The authenticated identity is already provisioned.');
    this.name = 'UserIdentityConflictError';
  }
}
