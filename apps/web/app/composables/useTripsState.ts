import type { JournalTrip } from "~/types/tripdex";
import type { Ref } from "vue";

export interface TripsState {
  trips: JournalTrip[];
  hasLoaded: boolean;
  loading: boolean;
  error: string | null;
  invalidated: boolean;
}

function emptyTrips(): TripsState {
  return { trips: [], hasLoaded: false, loading: false, error: null, invalidated: false };
}

export function useTripsState() {
  return useState<TripsState>("private-trips-cache", emptyTrips);
}

export function resetTripsCache(state: Ref<TripsState>): void {
  state.value = emptyTrips();
}
