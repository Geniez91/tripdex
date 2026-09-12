import type {
  CommunityActivity,
  CommunityActivityResponse,
} from "~/types/interfaces/community";
import { getCommunityActivity } from "~/services/api/community";

interface CommunityActivityState {
  activities: CommunityActivity[];
  nextCursor: string | null;
  hasLoaded: boolean;
  loading: boolean;
  error: string | null;
  invalidated: boolean;
}

// Request coordination is scoped to the Nuxt state, never serialized in it.
const requests = new WeakMap<CommunityActivityState, {
  version: number;
  pending: Promise<void> | null;
}>();

export function useCommunityActivity() {
  const config = useRuntimeConfig();
  const state = useState<CommunityActivityState>("community-activity-cache", () => ({
    activities: [],
    nextCursor: null,
    hasLoaded: false,
    loading: false,
    error: null,
    invalidated: false,
  }));
  let request = requests.get(state.value);
  if (!request) {
    request = { version: 0, pending: null };
    requests.set(state.value, request);
  }
  const coordination = request;

  function invalidate(): void {
    coordination.version++;
    state.value.invalidated = true;
  }

  function response(): CommunityActivityResponse {
    return { activities: state.value.activities, nextCursor: state.value.nextCursor };
  }

  async function fetchPage(cursor: string | null): Promise<void> {
    const version = coordination.version;
    state.value.loading = true;
    state.value.error = null;
    try {
      const page = await getCommunityActivity(config.public.apiBase, cursor);
      // A local mutation during the request makes this response obsolete.
      if (version !== coordination.version) return;
      const activities = cursor
        ? [...state.value.activities, ...page.activities]
        : page.activities;
      state.value.activities = [...new Map(
        activities.map((activity) => [activity.trip.id, activity]),
      ).values()];
      state.value.nextCursor = page.nextCursor;
      state.value.hasLoaded = true;
      state.value.invalidated = false;
    } catch {
      if (version === coordination.version) {
        state.value.error = "Impossible de charger l’activité communautaire.";
      }
    } finally {
      state.value.loading = false;
    }
  }

  async function run(cursor: string | null): Promise<void> {
    const pending = fetchPage(cursor);
    coordination.pending = pending;
    try {
      await pending;
    } finally {
      coordination.pending = null;
    }
  }

  async function load(): Promise<CommunityActivityResponse> {
    if (state.value.hasLoaded && !state.value.invalidated) return response();
    if (coordination.pending) await coordination.pending;
    else await run(null);
    if (state.value.invalidated && !state.value.error) return load();
    return response();
  }

  async function loadMore(): Promise<void> {
    if (!state.value.hasLoaded || state.value.invalidated) {
      await load();
      return;
    }
    if (coordination.pending || !state.value.nextCursor) return;
    await run(state.value.nextCursor);
  }

  async function retry(): Promise<void> {
    if (state.value.hasLoaded && !state.value.invalidated) await loadMore();
    else await load();
  }

  return {
    ...toRefs(state.value),
    load,
    loadMore,
    invalidate,
    retry,
  };
}
