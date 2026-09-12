export function usePrivateSession() {
  const tripsCache = useTripsState();
  const scope = useState("tripdex-private-session", () => ({
    userId: null as string | null,
    version: 0,
  }));

  function changeUser(userId: string | null): void {
    if (scope.value.userId === userId) return;
    scope.value = { userId, version: scope.value.version + 1 };
    resetTripsCache(tripsCache);
    clearNuxtData((key) => key.startsWith("private-"));
  }

  return { scope, changeUser };
}
