export interface ContestRecord {
  id: string;
  weeklyPeriod?: string | null;
  countryId: string;
  startsAt: string;
  endsAt: string;
  status: 'OPEN' | 'CLOSED';
  winnerSubmissionId: string | null;
  createdAt: string;
}

export interface PhotoContestCreation {
  eligibleCountry(countryId: string): Promise<boolean>;
  create(countryId: string, startsAt: string, endsAt: string): Promise<ContestRecord>;
}
export interface ContestCountry { id: string; iso2: string; iso3: string; name: string }
export interface SubmissionRecord {
  id: string; contestId: string; userId: string; tripId: string;
  coverStoragePath: string; createdAt: string;
}
export interface CandidateRecord extends SubmissionRecord {
  username: string; avatarUrl: string | null; tripTitle: string; votes: number;
}
export interface ContestDetailRecord {
  contest: ContestRecord; country: ContestCountry; submissions: CandidateRecord[];
}
export interface EligibleTripRecord {
  id: string; userId: string; visibility: string; coverStoragePath: string | null;
  countryIds: string[];
}
export interface ContestTransaction {
  contest: ContestRecord;
  trip(id: string): Promise<EligibleTripRecord | null>;
  ownSubmission(userId: string): Promise<SubmissionRecord | null>;
  submit(userId: string, tripId: string, path: string): Promise<void>;
  candidates(): Promise<CandidateRecord[]>;
  vote(userId: string, submissionId: string): Promise<void>;
  close(winnerSubmissionId: string | null): Promise<void>;
}
export interface MemoryRecord {
  contestId: string; country: ContestCountry; winner: CandidateRecord;
}
