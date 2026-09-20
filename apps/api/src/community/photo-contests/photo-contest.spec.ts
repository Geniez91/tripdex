import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { PhotoContestService, PhotoContestClock } from './photo-contest.service.js';
import { PhotoContestRepository } from './photo-contest.repository.js';
import { TripCoversService } from '../../trips/trip-covers.service.js';
import { assertPeriod, assertOpen, assertSubmission, selectWinner, currentWinnerContest } from './photo-contest.rules.js';
import { PhotoContestMapper } from './photo-contest.mapper.js';
import { SubmissionPipe, VotePipe } from './photo-contest-input.pipe.js';
import type { ICandidateRecord, IContestRecord, IContestTransaction, IEligibleTripRecord } from './photo-contest.types.js';

const contest: IContestRecord = { id: 'contest', countryId: 'jp', startsAt: '2042-01-01T00:00:00.000Z',
  endsAt: '2042-01-08T00:00:00.000Z', status: 'OPEN', winnerSubmissionId: null, createdAt: '2041-12-31T00:00:00.000Z' };
const now = new Date('2042-01-04T00:00:00.000Z');
const trip: IEligibleTripRecord = { id: 'trip', userId: 'owner', visibility: 'public', coverStoragePath: 'internal', countryIds: ['jp'] };
const candidate: ICandidateRecord = { id: 'a', contestId: 'contest', userId: 'owner', tripId: 'trip', coverStoragePath: 'internal',
  createdAt: '2042-01-02T00:00:00.000Z', username: 'traveler', avatarUrl: null, tripTitle: 'Japan', votes: 0 };

describe('Photo contest rules', () => {
  const previous: IContestRecord = { ...contest, status: 'CLOSED', id: 'old', winnerSubmissionId: 'old-winner' };
  const next: IContestRecord = { ...contest, id: 'new', startsAt: '2042-01-08T00:00:00.000Z', endsAt: '2042-01-15T00:00:00.000Z' };
  it.each<{ name: string; history: IContestRecord[]; winner: string | null }>([
    { name: 'no history', history: [], winner: null },
    { name: 'OPEN without past winner', history: [contest], winner: null },
    { name: 'previous winner plus OPEN', history: [previous, next], winner: 'old-winner' },
    { name: 'new CLOSED winner', history: [previous, { ...next, status: 'CLOSED', winnerSubmissionId: 'new-winner' }], winner: 'new-winner' },
    { name: 'CLOSED empty preserves previous', history: [previous, { ...next, status: 'CLOSED' }], winner: 'old-winner' },
    { name: 'CLOSED empty without previous', history: [{ ...next, status: 'CLOSED' }], winner: null },
  ])('memory: $name', ({ history, winner }) => {
    // Arrange
    const records = [...history];
    // Act
    const current = currentWinnerContest(records);
    // Assert
    expect(current?.winnerSubmissionId ?? null).toBe(winner);
  });
  it.each([['2042-01-01', '2042-01-01'], ['2042-01-02', '2042-01-01'], ['bad', '2042-01-01']])('rejects invalid period %s / %s', (start, end) => {
    // Arrange
    const operation = () => assertPeriod(start, end);
    // Act / Assert
    expect(operation).toThrow();
  });
  it('accepts an ordered period', () => {
    // Arrange
    const operation = () => assertPeriod(contest.startsAt, contest.endsAt);
    // Act / Assert
    expect(operation).not.toThrow();
  });
  it.each(['2041-12-31', '2042-01-08', '2042-01-09'])('rejects mutations outside the period at %s', date => {
    // Arrange
    const at = new Date(date);
    // Act / Assert
    expect(() => assertOpen(contest, at)).toThrow();
  });
  it('OPEN accepts during its period; CLOSED rejects even during it', () => {
    // Arrange
    const closed: IContestRecord = { ...contest, status: 'CLOSED' };
    // Act / Assert
    expect(() => assertOpen(contest, now)).not.toThrow();
    expect(() => assertOpen(closed, now)).toThrow();
  });
  it.each([
    { ...trip, userId: 'other' }, { ...trip, visibility: 'private' },
    { ...trip, countryIds: ['fr'] }, { ...trip, coverStoragePath: null }, null,
  ])('rejects an ineligible submission %#', value => {
    // Arrange
    const userId = 'owner';
    // Act / Assert
    expect(() => assertSubmission(value, userId, 'jp')).toThrow();
  });
  it('accepts the owned PUBLIC trip with country and cover', () => {
    // Arrange
    const value = { ...trip };
    // Act / Assert
    expect(() => assertSubmission(value, 'owner', 'jp')).not.toThrow();
  });
  it('most votes wins', () => {
    // Arrange
    const candidates = [candidate, { ...candidate, id: 'b', votes: 2 }];
    // Act
    const winner = selectWinner(candidates);
    // Assert
    expect(winner).toBe('b');
  });
  it('ties prefer earliest submission then smallest id', () => {
    // Arrange
    const candidates = [{ ...candidate, id: 'c', createdAt: '2042-01-03T00:00:00.000Z' }, { ...candidate, id: 'b' }, candidate];
    // Act
    const winner = selectWinner(candidates);
    // Assert
    expect(winner).toBe('a');
  });
  it('no submission gives no winner', () => {
    // Arrange
    const candidates: ICandidateRecord[] = [];
    // Act / Assert
    expect(selectWinner(candidates)).toBeNull();
  });
  it('maps a real contest activity without internal data', () => {
    // Arrange
    const record = { contest, country: { id: 'jp', iso2: 'JP', iso3: 'JPN', name: 'Japan' }, submissions: [candidate] };
    // Act
    const dto = PhotoContestMapper.detail(record, new Map([['a', 'https://signed.test/photo']]), now);
    const activity = PhotoContestMapper.activity(dto);
    // Assert
    expect(activity.type).toBe('PHOTO_CONTEST_OPENED');
    expect(activity.activityDate).toBe(contest.startsAt);
    expect(dto.submissions[0].imageUrl).toBe('https://signed.test/photo');
    expect(JSON.stringify(dto)).not.toMatch(/coverStoragePath|userId|email|supabaseAuthId|internal/);
  });
  it('memory needs the real winning image; no fallback', () => {
    // Arrange
    const record = { contestId: 'contest', country: { id: 'jp', iso2: 'JP', iso3: 'JPN', name: 'Japan' }, winner: candidate };
    // Act / Assert
    expect(PhotoContestMapper.memory(record, null)).toBeNull();
    expect(PhotoContestMapper.memory(record, 'https://signed.test/photo')?.winnerSubmissionId).toBe('a');
  });
  it('request pipes reject arbitrary image URLs and unrelated fields', () => {
    // Arrange
    const submission = new SubmissionPipe();
    const vote = new VotePipe();
    // Act / Assert
    expect(() => submission.transform({ tripId: 'trip', imageUrl: 'https://external' })).toThrow();
    expect(() => submission.transform({ imageUrl: 'https://external' })).toThrow();
    expect(() => vote.transform({ submissionId: [] })).toThrow();
    expect(submission.transform({ tripId: 'trip' })).toEqual({ tripId: 'trip' });
    expect(vote.transform({ submissionId: 'a' })).toEqual({ submissionId: 'a' });
  });
});

describe('Photo contest service orchestration', () => {
  let service: PhotoContestService;
  let tx: IContestTransaction;
  const submit = jest.fn<IContestTransaction['submit']>();
  const vote = jest.fn<IContestTransaction['vote']>();
  const close = jest.fn<IContestTransaction['close']>();
  const eligibleCountry = jest.fn<PhotoContestRepository['eligibleCountry']>();
  const create = jest.fn<PhotoContestRepository['create']>();
  beforeEach(async () => {
    submit.mockReset(); vote.mockReset(); close.mockReset(); create.mockReset();
    tx = { contest: { ...contest }, trip: async () => trip, ownSubmission: async () => null,
      submit, vote, close, candidates: async () => [candidate] };
    const module = await Test.createTestingModule({ providers: [PhotoContestService,
      { provide: PhotoContestClock, useValue: { now: () => now } },
      { provide: TripCoversService, useValue: {} },
      { provide: PhotoContestRepository, useValue: { eligibleCountry, create,
        withContest: (_id: string, operation: (context: IContestTransaction) => Promise<void>) => operation(tx) } },
    ] }).compile();
    service = module.get(PhotoContestService);
  });
  it('PRIVATE-only country cannot be scheduled', async () => {
    // Arrange
    eligibleCountry.mockResolvedValue(false);
    // Act / Assert
    await expect(service.create('jp', contest.startsAt, contest.endsAt)).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
  it('PUBLIC country can be explicitly scheduled', async () => {
    // Arrange
    eligibleCountry.mockResolvedValue(true);
    create.mockResolvedValue(contest);
    // Act
    await service.create('jp', contest.startsAt, contest.endsAt);
    // Assert
    expect(create).toHaveBeenCalledWith('jp', contest.startsAt, contest.endsAt);
  });
  it('OPEN accepts submission and a self vote', async () => {
    // Arrange
    const userId = 'owner';
    // Act
    await service.submit('contest', userId, 'trip');
    await service.vote('contest', userId, 'a');
    // Assert
    expect(submit).toHaveBeenCalledWith('owner', 'trip', 'internal');
    expect(vote).toHaveBeenCalledWith('owner', 'a');
  });
  it('a second submission is rejected', async () => {
    // Arrange
    tx.ownSubmission = async () => candidate;
    // Act / Assert
    await expect(service.submit('contest', 'owner', 'trip')).rejects.toThrow();
    expect(submit).not.toHaveBeenCalled();
  });
  it('CLOSED rejects both submission and vote', async () => {
    // Arrange
    tx.contest.status = 'CLOSED';
    // Act / Assert
    await expect(service.submit('contest', 'owner', 'trip')).rejects.toThrow();
    await expect(service.vote('contest', 'owner', 'a')).rejects.toThrow();
    expect(submit).not.toHaveBeenCalled(); expect(vote).not.toHaveBeenCalled();
  });
  it('rejects a candidate from another contest', async () => {
    // Arrange
    const otherId = 'other';
    // Act / Assert
    await expect(service.vote('contest', 'owner', otherId)).rejects.toThrow();
    expect(vote).not.toHaveBeenCalled();
  });
  it('closes with a deterministic winner and is idempotent', async () => {
    // Arrange
    const id = 'contest';
    // Act
    await service.close(id);
    tx.contest.status = 'CLOSED';
    await service.close(id);
    // Assert
    expect(close).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledWith('a');
  });
  it('closes without winner when empty', async () => {
    // Arrange
    tx.candidates = async () => [];
    // Act
    await service.close('contest');
    // Assert
    expect(close).toHaveBeenCalledWith(null);
  });
});
