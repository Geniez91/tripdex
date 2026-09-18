import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../prisma/database.service.js';
import type { IOwnedTripCoverRecord } from '../types/trip-cover-record.js';

@Injectable()
export class TripCoversRepository {
  constructor(private readonly database: DatabaseService) {}

  async isSubmitted(tripId: string, coverStoragePath: string): Promise<boolean> {
    return !!await this.database.client.orm.public.PhotoContestSubmission.where({ tripId, coverStoragePath }).first();
  }

  findOwned(
    userId: string,
    tripId: string,
  ): Promise<IOwnedTripCoverRecord | null> {
    return this.database.client.orm.public.Trip.where({
      id: tripId,
      userId,
    })
      .select('id', 'coverStoragePath')
      .first();
  }

  async updatePath(
    userId: string,
    tripId: string,
    expectedPath: string | null,
    coverStoragePath: string | null,
  ): Promise<boolean> {
    const updated = await this.database.client.orm.public.Trip.where({
      id: tripId,
      userId,
      coverStoragePath: expectedPath,
    }).update({ coverStoragePath });
    return Boolean(updated);
  }
}
