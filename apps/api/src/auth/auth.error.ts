export class AuthVerificationError extends Error {
  constructor(readonly code: 'AUTH_INVALID' | 'AUTH_UNAVAILABLE') {
    super(code);
    this.name = 'AuthVerificationError';
  }
}
