import type { JournalTrip } from "~/types/tripdex";

/** Keeps API order and only derives display years for the timeline. */
export function journalYears(
  trips: readonly Pick<JournalTrip, "startDate">[],
): number[] {
  return trips.map((trip) => new Date(trip.startDate).getFullYear());
}
