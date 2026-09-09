import type { Session } from "@supabase/supabase-js";
import type {
  AuthSessionSnapshot,
  AuthStatus,
  TripDexProfile,
} from "~/types/auth";
import { AuthActionError as AuthActionErrorClass } from "~/types/auth";

interface AuthState {
  status: AuthStatus;
  session: AuthSessionSnapshot | null;
  profile: TripDexProfile | null;
  error: string | null;
  errorCode: string | null;
}

let initialization: Promise<void> | null = null;
let listenerRegistered = false;
let profileRequest = 0;
let pendingProfile: Promise<void> = Promise.resolve();
let signingOut = false;

export function useAuth() {
  const { $supabase } = useNuxtApp();
  const api = useTripdexApi();
  const { scope, changeUser } = usePrivateSession();
  const state = useState<AuthState>("tripdex-auth", () => ({
    status: "initializing",
    session: null,
    profile: null,
    error: null,
    errorCode: null,
  }));

  if (!$supabase) {
    state.value.status = "anonymous";
  }

  function setSession(session: Session | null) {
    state.value.session = session
      ? { expiresAt: session.expires_at ?? null }
      : null;
  }

  async function resolveProfile(
    session: Session,
    request: number,
  ): Promise<void> {
    setSession(session);
    state.value.status = "resolving-profile";
    state.value.error = null;
    state.value.errorCode = null;
    try {
      const profile = await api.get<TripDexProfile>("/me");
      if (request !== profileRequest) return;
      state.value.profile = profile;
      state.value.status = "authenticated";
    } catch (error: unknown) {
      if (request !== profileRequest) return;
      state.value.profile = null;
      state.value.status = "error";
      state.value.error = error instanceof Error ? error.message : "auth";
      const data =
        typeof error === "object" && error !== null && "data" in error
          ? error.data
          : undefined;
      state.value.errorCode =
        typeof data === "object" &&
        data !== null &&
        "code" in data &&
        typeof data.code === "string"
          ? data.code
          : null;
    }
  }

  async function syncSession(session: Session | null): Promise<void> {
    const request = ++profileRequest;
    const userId = session?.user.id ?? null;
    if (scope.value.userId !== userId) state.value.profile = null;
    changeUser(userId);
    if (!session) {
      setSession(null);
      state.value.profile = null;
      state.value.error = null;
      state.value.errorCode = null;
      state.value.status = "anonymous";
      pendingProfile = Promise.resolve();
      return;
    }
    pendingProfile = resolveProfile(session, request);
    await pendingProfile;
  }

  async function initialize(): Promise<void> {
    if (import.meta.server) return;
    if (!$supabase) {
      state.value.status = "anonymous";
      return;
    }
    if (initialization) {
      if (state.value.status === "initializing") await initialization;
      await pendingProfile;
      return;
    }
    initialization = (async () => {
      state.value.status = "initializing";
      if (!listenerRegistered) {
        listenerRegistered = true;
        $supabase.auth.onAuthStateChange((event, session) => {
          if (signingOut && session) return;
          if (
            event === "SIGNED_IN" ||
            event === "SIGNED_OUT" ||
            event === "TOKEN_REFRESHED"
          ) {
            if (
              session &&
              scope.value.userId === session.user.id &&
              (state.value.status === "authenticated" ||
                state.value.status === "resolving-profile")
            ) {
              setSession(session);
              return;
            }
            // Invalidate private state synchronously; defer SDK work outside
            // the Supabase callback (which may hold the session lock).
            const request = ++profileRequest;
            const userId = session?.user.id ?? null;
            if (scope.value.userId !== userId) state.value.profile = null;
            changeUser(userId);
            setSession(session);
            state.value.status = session ? "resolving-profile" : "anonymous";
            state.value.error = null;
            state.value.errorCode = null;
            pendingProfile = new Promise<void>((resolve) => {
              setTimeout(() => {
                if (request === profileRequest && session)
                  void resolveProfile(session, request).then(resolve);
                else resolve();
              }, 0);
            });
          }
        });
      }
      const request = profileRequest;
      const { data, error } = await $supabase.auth.getSession();
      if (request !== profileRequest) {
        await pendingProfile;
        return;
      }
      if (error) throw new AuthActionErrorClass("AUTH_UNAVAILABLE");
      await syncSession(data.session);
    })().catch((error: unknown) => {
      state.value.status = "error";
      state.value.error = error instanceof Error ? error.message : "auth";
      initialization = null;
    });
    return initialization;
  }

  async function logout(): Promise<void> {
    if (!$supabase || signingOut) return;
    signingOut = true;
    // Clear the UI and invalidate pending responses before the network call.
    await syncSession(null);
    try {
      const { error } = await $supabase.auth.signOut();
      if (error) throw error;
    } catch {
      state.value.errorCode = "AUTH_UNAVAILABLE";
      state.value.error = "Déconnexion non confirmée. Réessayez.";
      throw new AuthActionErrorClass("AUTH_UNAVAILABLE");
    } finally {
      signingOut = false;
    }
  }

  function requireSupabase() {
    if (!$supabase || signingOut)
      throw new AuthActionErrorClass("AUTH_UNAVAILABLE");
    return $supabase;
  }

  function validateUsername(username: string): string {
    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(normalized)) {
      throw new AuthActionErrorClass("USERNAME_INVALID");
    }
    return normalized;
  }

  async function register(
    email: string,
    username: string,
    password: string,
  ): Promise<boolean> {
    const supabase = requireSupabase();
    const normalizedUsername = validateUsername(username);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { username: normalizedUsername },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw new AuthActionErrorClass("AUTH_UNAVAILABLE");
    if (!data.session) {
      await syncSession(null);
      return false;
    }
    await syncSession(data.session);
    if (state.value.status === "error") {
      throw new AuthActionErrorClass(
        state.value.errorCode === "USERNAME_TAKEN"
          ? "USERNAME_TAKEN"
          : "AUTH_UNAVAILABLE",
      );
    }
    return true;
  }

  async function login(email: string, password: string): Promise<void> {
    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      const code = /confirm|verified/i.test(error.message)
        ? "EMAIL_CONFIRMATION_REQUIRED"
        : "INVALID_CREDENTIALS";
      throw new AuthActionErrorClass(code);
    }
    if (!data.session) {
      throw new AuthActionErrorClass("EMAIL_CONFIRMATION_REQUIRED");
    }
    await syncSession(data.session);
    if (state.value.status === "error") {
      throw new AuthActionErrorClass(
        state.value.errorCode === "USERNAME_TAKEN"
          ? "USERNAME_TAKEN"
          : "AUTH_UNAVAILABLE",
      );
    }
  }

  async function completeProvisioning(username: string): Promise<void> {
    const supabase = requireSupabase();
    const normalizedUsername = validateUsername(username);
    const { error } = await supabase.auth.updateUser({
      data: { username: normalizedUsername },
    });
    if (error) throw new AuthActionErrorClass("AUTH_UNAVAILABLE");
    const { data } = await supabase.auth.getSession();
    if (!data.session)
      throw new AuthActionErrorClass("EMAIL_CONFIRMATION_REQUIRED");
    await syncSession(data.session);
    if (state.value.status === "error") {
      throw new AuthActionErrorClass(
        state.value.errorCode === "USERNAME_TAKEN"
          ? "USERNAME_TAKEN"
          : "AUTH_UNAVAILABLE",
      );
    }
  }

  return {
    status: computed(() => state.value.status),
    session: computed(() => state.value.session),
    profile: computed(() => state.value.profile),
    error: computed(() => state.value.error),
    errorCode: computed(() => state.value.errorCode),
    sessionVersion: computed(() => scope.value.version),
    initialize,
    register,
    login,
    completeProvisioning,
    logout,
  };
}
