import type { Country } from "~/types/tripdex";
export interface PhotoContestSubmission {
  id: string; imageUrl: string | null; createdAt: string; votes: number;
  user: { username: string; avatarUrl: string | null };
  trip: { id: string; title: string };
}
export interface PhotoContest {
  id: string; country: Pick<Country, "id" | "iso2" | "iso3" | "name">;
  startsAt: string; endsAt: string; status: "OPEN" | "CLOSED";
  acceptsEntries: boolean; winnerSubmissionId: string | null;
  totalVotes: number; submissions: PhotoContestSubmission[];
}
export interface PhotoContestParticipation {
  votedSubmissionId: string | null; ownSubmissionId: string | null;
  eligibleTrips: { id: string; title: string; imageUrl: string | null }[];
}
export interface CountryMemory {
  countryCode: string; countryName: string; imageUrl: string;
  contestId: string; winnerSubmissionId: string;
  user: { username: string; avatarUrl: string | null };
  trip: { id: string; title: string };
}
