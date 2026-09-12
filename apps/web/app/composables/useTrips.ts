import type { JournalTrip } from "~/types/tripdex";
import type { TripsState } from "./useTripsState";
import { getJournalTrips } from "~/services/api/trips";

const requests = new WeakMap<TripsState, { version: number; pending: Promise<void> | null }>();

export function useTrips() {
  const state = useTripsState();
  const { scope } = usePrivateSession();
  const api = useTripdexApi();

  function coordination(snapshot: TripsState) {
    let request = requests.get(snapshot);
    if (!request) {
      request = { version: 0, pending: null };
      requests.set(snapshot, request);
    }
    return request;
  }

  function invalidate(): void {
    coordination(state.value).version++;
    state.value.invalidated = true;
  }

  async function load(): Promise<JournalTrip[]> {
    if (!scope.value.userId) return [];
    const snapshot = state.value;
    if (snapshot.hasLoaded && !snapshot.invalidated) return snapshot.trips;
    const request = coordination(snapshot);
    if (request.pending) await request.pending;
    else {
      const version = request.version;
      snapshot.loading = true;
      snapshot.error = null;
      request.pending = (async () => {
        try {
          const trips = await getJournalTrips(api);
          if (state.value !== snapshot || version !== request.version) return;
          snapshot.trips = trips;
          snapshot.hasLoaded = true;
          snapshot.invalidated = false;
        } catch {
          if (state.value === snapshot && version === request.version) {
            snapshot.error = "Impossible de charger le journal.";
          }
        } finally {
          snapshot.loading = false;
        }
      })();
      try {
        await request.pending;
      } finally {
        request.pending = null;
      }
    }
    // Never restore or retry a previous user's request after a session change.
    if (state.value !== snapshot) return [];
    if (snapshot.invalidated && !snapshot.error) return load();
    return snapshot.trips;
  }

  return {
    trips: computed(() => state.value.trips),
    hasLoaded: computed(() => state.value.hasLoaded),
    loading: computed(() => state.value.loading),
    error: computed(() => state.value.error),
    invalidated: computed(() => state.value.invalidated),
    load,
    invalidate,
  };
}
