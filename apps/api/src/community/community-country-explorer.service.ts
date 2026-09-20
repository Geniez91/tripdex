import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TripCoversService } from '../trips/trip-covers.service.js';
import { PhotoContestService } from './photo-contests/photo-contest.service.js';
import { CommunityCountryExplorerRepository } from './repositories/community-country-explorer.repository.js';
import { CommunityClock } from './community-clock.js';
import { isCommunityCountryExplorerRecentTripRecord } from './community-country-explorer.helpers.js';
import type {
  ICommunityCountryExplorerDto,
  ICommunityCountryExplorerTripDto,
} from './dto/community-country-explorer.dto.js';
import type { TCommunityCountryExplorerRecentTripRecord } from './types/community-country-explorer-record.js';

function isoDate(value: string): string {
  return new Date(value).toISOString();
}

@Injectable()
export class CommunityCountryExplorerService {
  constructor(
    private readonly repository: CommunityCountryExplorerRepository,
    private readonly covers: TripCoversService,
    private readonly contests: PhotoContestService,
    private readonly clock: CommunityClock,
  ) {}

  async detail(countryCode: string): Promise<ICommunityCountryExplorerDto> {
    if (!/^[A-Za-z]{3}$/.test(countryCode)) {
      throw new BadRequestException('countryCode must be an ISO 3166-1 alpha-3 code.');
    }
    const code = countryCode.toUpperCase();
    const rows = await this.repository.detail(code, this.clock.today());
    const first = rows[0];
    if (!first) {
      throw new NotFoundException('Country not found.');
    }

    const recentTrips = await Promise.all(
      rows
        .filter(isCommunityCountryExplorerRecentTripRecord)
        .map(row => this.toRecentTrip(row)),
    );
    const [memory] = await this.contests.memories(code);

    return {
      country: {
        id: first.countryId,
        iso2: first.iso2,
        iso3: first.iso3,
        name: first.name,
      },
      stats: {
        travelers: first.travelers,
        travelersNow: first.travelersNow,
        averageRating: first.averageRating,
        ratingCount: first.ratingCount,
      },
      recentTrips,
      memory: memory ?? null,
    };
  }

  private async toRecentTrip(
    row: TCommunityCountryExplorerRecentTripRecord,
  ): Promise<ICommunityCountryExplorerTripDto> {
    return {
      id: row.tripId,
      title: row.tripTitle,
      createdAt: isoDate(row.tripCreatedAt),
      startDate: isoDate(row.tripStartDate),
      endDate: row.tripEndDate ? isoDate(row.tripEndDate) : null,
      rating: row.tripRating,
      review: row.tripReview,
      coverUrl: await this.covers.readUrl(
        row.tripUserId,
        row.tripId,
        row.coverStoragePath,
      ),
      user: { username: row.username },
    };
  }
}
