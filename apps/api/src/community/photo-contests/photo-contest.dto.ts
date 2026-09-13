import type { ContestCountry } from './photo-contest.types.js';

export interface SubmissionInput { tripId: string }
export interface VoteInput { submissionId: string }
export interface PhotoContestSubmissionDto {
  id: string; imageUrl: string | null; createdAt: string; votes: number;
  user: { username: string; avatarUrl: string | null };
  trip: { id: string; title: string };
}
export interface PhotoContestDto {
  id: string; country: ContestCountry; startsAt: string; endsAt: string;
  status: 'OPEN' | 'CLOSED'; acceptsEntries: boolean;
  winnerSubmissionId: string | null; totalVotes: number;
  submissions: PhotoContestSubmissionDto[];
}
export interface PhotoContestParticipationDto {
  votedSubmissionId: string | null;
  ownSubmissionId: string | null;
  eligibleTrips: { id: string; title: string; imageUrl: string | null }[];
}
export interface CountryMemoryDto {
  countryCode: string; countryName: string; imageUrl: string;
  contestId: string; winnerSubmissionId: string;
  user: { username: string; avatarUrl: string | null };
  trip: { id: string; title: string };
}
