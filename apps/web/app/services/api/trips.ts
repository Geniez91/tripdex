import type { TripdexApi } from "~/types/interfaces/api";
import type {
  CreateTripInput,
  TripCoverResult,
} from "~/types/interfaces/trips";
import type { CreatedTrip, JournalTrip } from "~/types/tripdex";

export function createTrip(
  api: TripdexApi,
  input: CreateTripInput,
): Promise<CreatedTrip> {
  return api.post<CreatedTrip>("/trips", { body: { ...input } });
}

export function getTrip(api: TripdexApi, tripId: string): Promise<JournalTrip> {
  return api.get<JournalTrip>(`/me/trips/${tripId}`);
}

export function getJournalTrips(api: TripdexApi): Promise<JournalTrip[]> {
  return api.get<JournalTrip[]>("/me/trips");
}

export function updateTripCover(
  api: TripdexApi,
  tripId: string,
  body: BodyInit,
): Promise<TripCoverResult> {
  return api.put<TripCoverResult>(`/me/trips/${tripId}/cover`, { body });
}

export function removeTripCover(
  api: TripdexApi,
  tripId: string,
): Promise<TripCoverResult> {
  return api.delete<TripCoverResult>(`/me/trips/${tripId}/cover`);
}
