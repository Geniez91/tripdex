import { civilYear } from "./dates";
import type { JournalTrip } from "~/types/tripdex";

/** Keeps API order and only derives display years for the timeline. */
export function journalYears(
  trips: readonly Pick<JournalTrip, "startDate">[],
): (number | null)[] {
  return trips.map((trip) => civilYear(trip.startDate));
}
