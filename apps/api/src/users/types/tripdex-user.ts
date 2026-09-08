export interface TripDexUser {
  id: string;
  email: string;
  username: string;
}

// Constructed only by the Auth adapter after verification with Supabase.
// requestedUsername is user-controlled metadata, never authorization data.
export interface VerifiedAuthIdentity {
  supabaseAuthId: string;
  email: string;
  requestedUsername: unknown;
}

export interface NewTripDexUser {
  supabaseAuthId: string;
  email: string;
  username: string;
}
