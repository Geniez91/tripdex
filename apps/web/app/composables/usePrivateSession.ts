export function usePrivateSession() {
  const scope = useState("tripdex-private-session", () => ({
    userId: null as string | null,
    version: 0,
  }));

  function changeUser(userId: string | null): void {
    if (scope.value.userId === userId) return;
    scope.value = { userId, version: scope.value.version + 1 };
    clearNuxtData((key) => key.startsWith("private-"));
  }

  return { scope, changeUser };
}
