import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { computed, ref } from "vue";

export const sessionA = {
  user: { id: "audit-a" },
  access_token: "synthetic-a",
};
export const sessionB = {
  user: { id: "audit-b" },
  access_token: "synthetic-b",
};
export const profileA = { id: "tripdex-a", username: "alice" };
export const profileB = { id: "tripdex-b", username: "bob" };

export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

// Exercise the actual composables with Nuxt globals and SDK/network boundaries
// replaced. Each harness gets its own module scope, as a fresh browser would.
export function harness(initialSession = sessionA, server = false) {
  let session = initialSession;
  let listener;
  const states = new Map();
  const caches = new Map([
    ["private-journal", [profileA]],
    ["countries", ["JP"]],
  ]);
  const calls = [];
  let refreshes = 0;
  let signouts = 0;
  const sdk = {
    getSession: async () => ({ data: { session }, error: null }),
    onAuthStateChange: (callback) => {
      listener = callback;
    },
    refreshSession: async () => {
      refreshes++;
      return { data: { session } };
    },
    signOut: async () => {
      signouts++;
      emit("SIGNED_OUT", null);
      return { error: null };
    },
  };
  let transport = async (_url, options) =>
    options.headers.get("Authorization") === "Bearer synthetic-b"
      ? profileB
      : profileA;
  const context = {
    exports: {},
    URL,
    Headers,
    DOMException,
    setTimeout,
    computed,
    useRuntimeConfig: () => ({
      public: { apiBase: "https://api.example.invalid" },
    }),
    useNuxtApp: () => ({ $supabase: { auth: sdk } }),
    useState: (key, init) => {
      if (!states.has(key)) states.set(key, ref(init()));
      return states.get(key);
    },
    clearNuxtData: (predicate) => {
      for (const key of caches.keys()) if (predicate(key)) caches.delete(key);
    },
    $fetch: (url, options) => {
      calls.push({ url, options });
      return transport(url, options);
    },
    defineNuxtRouteMiddleware: (middleware) => middleware,
    defineNuxtPlugin: (plugin) => plugin,
    navigateTo: (location) => ({ redirect: location }),
  };
  function load(path) {
    const source = readFileSync(
      new URL(`../${path}`, import.meta.url),
      "utf8",
    ).replaceAll("import.meta.server", String(server));
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const module = { ...context, exports: {} };
    vm.runInNewContext(compiled, module, { filename: path });
    return module.exports;
  }
  const authTypes = load("../app/types/auth.ts");
  context.require = (name) => {
    if (name === "~/types/auth") return authTypes;
    if (name === "~/services/api/auth") {
      return {
        getCurrentProfile: (api) => api.get("/me"),
      };
    }
    throw new Error(`Unexpected test import: ${name}`);
  };
  const tripsState = load("../app/composables/useTripsState.ts");
  context.resetTripsCache = tripsState.resetTripsCache;
  context.useTripsState = tripsState.useTripsState;
  context.usePrivateSession = load(
    "../app/composables/usePrivateSession.ts",
  ).usePrivateSession;
  context.useTripdexApi = load(
    "../app/composables/useTripdexApi.ts",
  ).useTripdexApi;
  context.useAuth = load("../app/composables/useAuth.ts").useAuth;
  function emit(event, nextSession) {
    session = nextSession;
    listener(event, nextSession);
  }
  return {
    auth: context.useAuth(),
    api: context.useTripdexApi(),
    privateSession: context.usePrivateSession(),
    sdk,
    caches,
    calls,
    emit,
    load,
    setTransport: (fn) => {
      transport = fn;
    },
    get refreshes() {
      return refreshes;
    },
    get signouts() {
      return signouts;
    },
  };
}
