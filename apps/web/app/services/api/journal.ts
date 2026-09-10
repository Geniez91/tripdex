import type { TripdexApi } from "~/types/interfaces/api";
import type { JournalTrip } from "~/types/tripdex";

export function getJournalTrips(api: TripdexApi): Promise<JournalTrip[]> {
  return api.get<JournalTrip[]>("/me/trips");
}
