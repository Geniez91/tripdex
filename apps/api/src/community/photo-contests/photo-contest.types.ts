export interface IContestRecord {
  id: string;
  weeklyPeriod?: string | null;
  countryId: string;
  startsAt: string;
  endsAt: string;
  status: 'OPEN' | 'CLOSED';
  winnerSubmissionId: string | null;
  createdAt: string;
}

export interface IPhotoContestCreation {
  eligibleCountry(countryId: string): Promise<boolean>;
  create(countryId: string, startsAt: string, endsAt: string): Promise<IContestRecord>;
}
export interface IContestCountry { id: string; iso2: string; iso3: string; name: string }
export interface ISubmissionRecord {
  id: string; contestId: string; userId: string; tripId: string;
  coverStoragePath: string; createdAt: string;
}
export interface ICandidateRecord extends ISubmissionRecord {
  username: string; avatarUrl: string | null; tripTitle: string; votes: number;
}
export interface IContestDetailRecord {
  contest: IContestRecord; country: IContestCountry; submissions: ICandidateRecord[];
}
export interface IEligibleTripRecord {
  id: string; userId: string; visibility: string; coverStoragePath: string | null;
  countryIds: string[];
}
export interface IContestTransaction {
  contest: IContestRecord;
  trip(id: string): Promise<IEligibleTripRecord | null>;
  ownSubmission(userId: string): Promise<ISubmissionRecord | null>;
  submit(userId: string, tripId: string, path: string): Promise<void>;
  candidates(): Promise<ICandidateRecord[]>;
  vote(userId: string, submissionId: string): Promise<void>;
  close(winnerSubmissionId: string | null): Promise<void>;
}
export interface IMemoryRecord {
  contestId: string; country: IContestCountry; winner: ICandidateRecord;
}

export interface IWeeklySelectionResult {
  outcome: 'created' | 'existing' | 'active' | 'no-candidate';
  contest: IContestRecord | null;
  countryName: string | null;
}

export interface IWeeklyCandidate {
  countryId: string; countryCode: string; countryName: string;
  tripId: string; userId: string; visibility: string;
  coverStoragePath: string | null; createdAt: string;
}

export interface IWeeklyPeriod {
  key: string;
  start: string;
  end: string;
}

export interface IWeeklySelectionContext {
  existing: IContestRecord | null;
  active: IContestRecord | null;
  previous: IContestRecord | null;
  candidates(): Promise<IWeeklyCandidate[]>;
  creation: IPhotoContestCreation;
}
