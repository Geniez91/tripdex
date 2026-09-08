export type AuthStatus =
  | "initializing"
  | "anonymous"
  | "resolving-profile"
  | "authenticated"
  | "error";

export interface TripDexProfile {
  id: string;
  email: string;
  username: string;
}

export interface AuthSessionSnapshot {
  expiresAt: number | null;
}

export type AuthActionErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMAIL_CONFIRMATION_REQUIRED"
  | "USERNAME_INVALID"
  | "USERNAME_TAKEN"
  | "AUTH_UNAVAILABLE";

export class AuthActionError extends Error {
  constructor(readonly code: AuthActionErrorCode) {
    super(code);
    this.name = "AuthActionError";
  }
}
