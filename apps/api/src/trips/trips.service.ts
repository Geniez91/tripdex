import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../prisma/database.module.js';
import type { CreateTripInput } from './create-trip.pipe.js';

@Injectable()
export class TripsService {
  constructor(private readonly database: DatabaseService) {}

  async create(userId: string, input: CreateTripInput) {
    return this.database.client.transaction(async (tx) => {
      const countries = await tx.orm.public.Country.where((country) =>
        country.id.in(input.countryIds),
      )
        .select('id', 'iso2', 'iso3', 'name')
        .all();
      if (countries.length !== input.countryIds.length) {
        throw new BadRequestException('One or more countries do not exist.');
      }
      const trip = await tx.orm.public.Trip.create({
        userId,
        title: input.title,
        startDate: input.startDate,
        endDate: input.endDate,
      });
      for (const country of countries) {
        await tx.orm.public.TripCountry.create({
          tripId: trip.id,
          countryId: country.id,
        });
      }
      return {
        id: trip.id,
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate,
        countries,
      };
    });
  }

  async visitedCountries(userId: string) {
    // EXISTS through the explicit junction keeps the response distinct and user-scoped.
    return await this.database.client.orm.public.Country.where((country) =>
      country.tripCountries.some((link) =>
        link.trip.some((trip) => trip.userId.eq(userId)),
      ),
    )
      .select('id', 'iso2', 'iso3', 'name', 'slug', 'continentCode')
      .orderBy((country) => country.name.asc())
      .all();
  }
}
