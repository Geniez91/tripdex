import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { TripCoversService } from '../../trips/trip-covers.service.js';
import { PhotoContestRepository } from './photo-contest.repository.js';
import { PhotoContestMapper } from './photo-contest.mapper.js';
import { assertOpen, assertPeriod, assertSubmission, selectWinner } from './photo-contest.rules.js';
import type { PhotoContestParticipationDto } from './photo-contest.dto.js';
import type { PhotoContestCreation, ContestRecord } from './photo-contest.types.js';

@Injectable()
export class PhotoContestClock { now(): Date { return new Date(); } }

@Injectable()
export class PhotoContestService {
  constructor(private readonly repository: PhotoContestRepository,
    private readonly covers: TripCoversService, private readonly clock: PhotoContestClock) {}

  // Scheduling and closure are internal operations, deliberately not HTTP routes.
  async create(countryId: string, startsAt: string, endsAt: string, persistence: PhotoContestCreation = this.repository): Promise<ContestRecord> {
    assertPeriod(startsAt, endsAt);
    if (!await persistence.eligibleCountry(countryId)) throw new BadRequestException('Ce pays ne possède aucun voyage PUBLIC.');
    return persistence.create(countryId, startsAt, endsAt);
  }
  async detail(id: string) {
    const record = await this.repository.detail(id);
    const urls = new Map<string, string | null>();
    await Promise.all(record.submissions.map(async s => {
      urls.set(s.id, await this.covers.readUrl(s.userId, s.tripId, s.coverStoragePath));
    }));
    return PhotoContestMapper.detail(record, urls, this.clock.now());
  }
  async submit(id: string, userId: string, tripId: string): Promise<void> {
    await this.repository.withContest(id, async tx => {
      assertOpen(tx.contest, this.clock.now());
      const trip = await tx.trip(tripId);
      assertSubmission(trip, userId, tx.contest.countryId);
      if (await tx.ownSubmission(userId)) throw new ConflictException('Vous avez déjà proposé un souvenir.');
      await tx.submit(userId, tripId, trip.coverStoragePath);
    });
  }
  async vote(id: string, userId: string, submissionId: string): Promise<void> {
    await this.repository.withContest(id, async tx => {
      assertOpen(tx.contest, this.clock.now());
      if (!(await tx.candidates()).some(s => s.id === submissionId)) throw new BadRequestException('Photo absente de ce concours.');
      await tx.vote(userId, submissionId);
    });
  }
  async close(id: string): Promise<void> {
    await this.repository.withContest(id, async tx => {
      if (tx.contest.status === 'CLOSED') return;
      await tx.close(selectWinner(await tx.candidates()));
    });
  }
  async participation(id: string, userId: string): Promise<PhotoContestParticipationDto> {
    const { contest } = await this.repository.detail(id);
    const result = await this.repository.participation(id, contest.countryId, userId);
    return { votedSubmissionId: result.votedSubmissionId, ownSubmissionId: result.ownSubmissionId,
      eligibleTrips: await Promise.all(result.eligibleTrips.map(async trip => ({ id: trip.id, title: trip.title,
        imageUrl: await this.covers.readUrl(userId, trip.id, trip.coverStoragePath) }))) };
  }
  async memories(countryCode?: string) {
    const records = await this.repository.memories(countryCode);
    const memories = await Promise.all(records.map(async record => PhotoContestMapper.memory(record,
      await this.covers.readUrl(record.winner.userId, record.winner.tripId, record.winner.coverStoragePath))));
    return memories.filter(memory => memory !== null);
  }
}
