import type { ICountryMemoryDto, IPhotoContestDto } from './photo-contest.dto.js';
import type { IContestDetailRecord, IMemoryRecord } from './photo-contest.types.js';
import { acceptsEntries } from './photo-contest.rules.js';

export class PhotoContestMapper {
  static detail(record: IContestDetailRecord, urls: Map<string, string | null>, now: Date): IPhotoContestDto {
    const { contest, country, submissions } = record;
    return {
      id: contest.id, country: { id: country.id, iso2: country.iso2, iso3: country.iso3, name: country.name },
      startsAt: new Date(contest.startsAt).toISOString(), endsAt: new Date(contest.endsAt).toISOString(),
      status: contest.status, winnerSubmissionId: contest.winnerSubmissionId,
      acceptsEntries: acceptsEntries(contest, now),
      totalVotes: submissions.reduce((sum, item) => sum + item.votes, 0),
      submissions: submissions.map(item => ({
        id: item.id, imageUrl: urls.get(item.id) ?? null, votes: item.votes,
        createdAt: new Date(item.createdAt).toISOString(),
        user: { username: item.username, avatarUrl: item.avatarUrl },
        trip: { id: item.tripId, title: item.tripTitle },
      })),
    };
  }
  static memory(record: IMemoryRecord, imageUrl: string | null): ICountryMemoryDto | null {
    if (!imageUrl) return null;
    return { countryCode: record.country.iso3, countryName: record.country.name, imageUrl,
      contestId: record.contestId, winnerSubmissionId: record.winner.id,
      user: { username: record.winner.username, avatarUrl: record.winner.avatarUrl },
      trip: { id: record.winner.tripId, title: record.winner.tripTitle } };
  }
  static activity(contest: IPhotoContestDto) {
    return { type: 'PHOTO_CONTEST_OPENED' as const, activityDate: contest.startsAt, contest };
  }
}
