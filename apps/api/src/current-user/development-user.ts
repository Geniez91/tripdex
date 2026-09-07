// Local development identity only. Supabase Auth will resolve the real identity.
export const DEVELOPMENT_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'developer@tripdex.invalid',
  username: 'tripdex-dev',
};

export function developmentAuthEnabled() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.DEV_AUTH_ENABLED === 'true'
  );
}
