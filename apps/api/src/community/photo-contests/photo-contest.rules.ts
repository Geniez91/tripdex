import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { ICandidateRecord, IContestRecord, IEligibleTripRecord } from './photo-contest.types.js';

export function assertPeriod(startsAt: string, endsAt: string): void {
  if (!Number.isFinite(Date.parse(startsAt)) || !Number.isFinite(Date.parse(endsAt)) ||
    Date.parse(startsAt) >= Date.parse(endsAt)) {
    throw new BadRequestException('startsAt must precede endsAt.');
  }
}
export function acceptsEntries(contest: IContestRecord, now: Date): boolean {
  return contest.status === 'OPEN' && Date.parse(contest.startsAt) <= now.getTime() &&
    now.getTime() < Date.parse(contest.endsAt);
}
export function assertOpen(contest: IContestRecord, now: Date): void {
  if (!acceptsEntries(contest, now)) throw new ConflictException('Ce concours n’accepte plus de participation ou n’a pas encore commencé.');
}
export function assertSubmission(trip: IEligibleTripRecord | null, userId: string, countryId: string): asserts trip is IEligibleTripRecord & { coverStoragePath: string } {
  if (!trip || trip.userId !== userId) throw new ForbiddenException('Ce voyage ne vous appartient pas.');
  if (trip.visibility !== 'public' || !trip.countryIds.includes(countryId) || !trip.coverStoragePath) {
    throw new BadRequestException('Un voyage PUBLIC dans ce pays avec une cover est nécessaire.');
  }
}
export function selectWinner(candidates: ICandidateRecord[]): string | null {
  return [...candidates].sort((a, b) => b.votes - a.votes ||
    (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0]?.id ?? null;
}

export function currentWinnerContest(history: IContestRecord[]): IContestRecord | null {
  return [...history].filter(contest => contest.status === 'CLOSED' && contest.winnerSubmissionId !== null)
    .sort((a, b) => Date.parse(b.endsAt) - Date.parse(a.endsAt) ||
      (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0) ||
      (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))[0] ?? null;
}
