import type { ITripDexUser } from '../users/types/tripdex-user.js';

// A symbol prevents collision with frontend-supplied body/query properties.
export const authenticatedUser = Symbol('tripdex.authenticatedUser');

export interface IAuthRequest {
  headers: { authorization?: string | string[] };
  [authenticatedUser]?: ITripDexUser;
}
