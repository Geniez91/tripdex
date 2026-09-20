import type { IContestCountry } from './photo-contest.types.js';

export interface ISubmissionInput {
  tripId: string;
}

export interface IVoteInput {
  submissionId: string;
}

export interface IPhotoContestUserDto {
  username: string;
  avatarUrl: string | null;
}

export interface IPhotoContestTripDto {
  id: string;
  title: string;
}

export interface IPhotoContestEligibleTripDto {
  id: string;
  title: string;
  imageUrl: string | null;
}

export interface IPhotoContestSubmissionDto {
  id: string;
  imageUrl: string | null;
  createdAt: string;
  votes: number;
  user: IPhotoContestUserDto;
  trip: IPhotoContestTripDto;
}

export interface IPhotoContestDto {
  id: string;
  country: IContestCountry;
  startsAt: string;
  endsAt: string;
  status: 'OPEN' | 'CLOSED';
  acceptsEntries: boolean;
  winnerSubmissionId: string | null;
  totalVotes: number;
  submissions: IPhotoContestSubmissionDto[];
}

export interface IPhotoContestParticipationDto {
  votedSubmissionId: string | null;
  ownSubmissionId: string | null;
  eligibleTrips: IPhotoContestEligibleTripDto[];
}

export interface ICountryMemoryDto {
  countryCode: string;
  countryName: string;
  imageUrl: string;
  contestId: string;
  winnerSubmissionId: string;
  user: IPhotoContestUserDto;
  trip: IPhotoContestTripDto;
}