const privatePrefixes = ["/journal", "/trips/", "/profile"];

function isPrivateRoute(path: string): boolean {
  return privatePrefixes.some(
    (prefix) => path === prefix || path.startsWith(prefix),
  );
}

export default defineNuxtRouteMiddleware(async (to) => {
  // The session is persisted by the browser SDK, not in server cookies.
  if (import.meta.server) return;
  if (!isPrivateRoute(to.path)) return;
  const auth = useAuth();
  await auth.initialize();
  if (auth.status.value === "authenticated") return;
  if (
    auth.status.value === "initializing" ||
    auth.status.value === "resolving-profile" ||
    auth.status.value === "error"
  )
    return;
  return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
});
