import type { ApiOptions, TripdexApi } from "~/types/interfaces/api";

export function useTripdexApi(): TripdexApi {
  const config = useRuntimeConfig();
  const { $supabase } = useNuxtApp();
  const { scope } = usePrivateSession();

  async function request<T>(
    path: string,
    options: ApiOptions = {},
  ): Promise<T> {
    // Accept only API paths, never absolute URLs, network paths or backslashes.
    if (!path.startsWith("/") || path.startsWith("//") || /[\\\s]/.test(path))
      throw new Error("Invalid API path.");
    const base = new URL(`${config.public.apiBase.replace(/\/$/, "")}/`);
    const url = new URL(path.slice(1), base);
    if (
      !["http:", "https:"].includes(base.protocol) ||
      url.origin !== base.origin ||
      !url.pathname.startsWith(base.pathname)
    )
      throw new Error("Invalid API path.");

    const version = scope.value.version;
    const userId = scope.value.userId;
    function assertCurrentSession(): void {
      if (scope.value.version !== version)
        throw new DOMException("Session changed.", "AbortError");
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      assertCurrentSession();
      const { data } = $supabase
        ? await $supabase.auth.getSession()
        : { data: { session: null } };
      assertCurrentSession();
      if ((data.session?.user.id ?? null) !== userId)
        throw new DOMException("Session changed.", "AbortError");
      const headers = new Headers(options.headers);
      headers.delete("Authorization");
      if (data.session?.access_token)
        headers.set("Authorization", `Bearer ${data.session.access_token}`);

      try {
        const result = await $fetch<T>(url.href, {
          ...options,
          headers,
          retry: 0,
          redirect: "error",
        });
        assertCurrentSession();
        return result;
      } catch (error: unknown) {
        assertCurrentSession();
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? error.statusCode
            : undefined;
        if (statusCode !== 401 || attempt !== 0 || !$supabase) throw error;
        const refreshed = await $supabase.auth.refreshSession();
        assertCurrentSession();
        if (
          !refreshed.data.session?.access_token ||
          refreshed.data.session.user.id !== userId
        )
          throw error;
      }
    }
    throw new Error("Authentication required.");
  }

  return {
    get: <T>(path: string, options?: ApiOptions) => request<T>(path, options),
    post: <T>(path: string, options?: ApiOptions) =>
      request<T>(path, { ...options, method: "POST" }),
    put: <T>(path: string, options?: ApiOptions) =>
      request<T>(path, { ...options, method: "PUT" }),
    delete: <T>(path: string, options?: ApiOptions) =>
      request<T>(path, { ...options, method: "DELETE" }),
  };
}
