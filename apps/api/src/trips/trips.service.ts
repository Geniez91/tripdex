import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../prisma/database.service.js';
import type { CreateTripInput } from './create-trip.pipe.js';
import { TripCoversService } from './trip-covers.service.js';

type TripSummary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  rating: number | null;
  review: string | null;
  coverStoragePath: string | null;
};

@Injectable()
export class TripsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly covers: TripCoversService,
  ) {}

  async create(userId: string, input: CreateTripInput) {
    const created = await this.database.client.transaction(async (tx) => {
      const countries = await tx.orm.public.Country.where((country) =>
        country.id.in(input.countryIds),
      )
        .select('id', 'iso2', 'iso3', 'name')
        .all();
      if (countries.length !== input.countryIds.length) {
        throw new BadRequestException('One or more countries do not exist.');
      }
      const cityIds = input.cityIds ?? [];
      const cities = cityIds.length
        ? await tx.orm.public.City.where((city) => city.id.in(cityIds))
            .select('id', 'name', 'slug', 'countryId')
            .all()
        : [];
      if (cities.length !== cityIds.length) {
        throw new BadRequestException('One or more cities do not exist.');
      }
      const countryIds = new Set(input.countryIds);
      if (cities.some((city) => !countryIds.has(city.countryId))) {
        throw new BadRequestException(
          'Each city must belong to a selected country.',
        );
      }
      const trip = await tx.orm.public.Trip.create({
        userId,
        title: input.title,
        startDate: input.startDate,
        endDate: input.endDate,
        rating: input.rating ?? null,
        review: input.review ?? null,
        coverStoragePath: null,
      });
      for (const country of countries) {
        await tx.orm.public.TripCountry.create({
          tripId: trip.id,
          countryId: country.id,
        });
      }
      for (const city of cities) {
        await tx.orm.public.TripCity.create({
          tripId: trip.id,
          cityId: city.id,
        });
      }
      return {
        id: trip.id,
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate,
        rating: trip.rating,
        review: trip.review,
        coverStoragePath: trip.coverStoragePath,
      };
    });
    return this.withDestinationsAndRevisit(userId, created, true);
  }

  async journal(userId: string) {
    const trips = await this.database.client.orm.public.Trip.where({ userId })
      .select(
        'id',
        'title',
        'startDate',
        'endDate',
        'rating',
        'review',
        'coverStoragePath',
      )
      .orderBy([(trip) => trip.startDate.desc(), (trip) => trip.id.desc()])
      .all();
    return Promise.all(
      trips.map(async (trip) => this.withDestinationsAndRevisit(userId, trip)),
    );
  }

  async detail(userId: string, tripId: string) {
    const trip = await this.database.client.orm.public.Trip.where({
      id: tripId,
      userId,
    })
      .select(
        'id',
        'title',
        'startDate',
        'endDate',
        'rating',
        'review',
        'coverStoragePath',
      )
      .first();
    if (!trip) throw new NotFoundException('Trip not found.');
    return this.withDestinationsAndRevisit(userId, trip, true);
  }

  private async withDestinationsAndRevisit(
    userId: string,
    trip: TripSummary,
    detail = false,
  ) {
    const links = await this.database.client.orm.public.TripCountry.where({
      tripId: trip.id,
    })
      .select('countryId')
      .all();
    const countryIds = links.map((link) => link.countryId);
    const countries = countryIds.length
      ? await this.database.client.orm.public.Country.where((country) =>
          country.id.in(countryIds),
        )
          .select('id', 'iso2', 'iso3', 'name', 'slug', 'continentCode')
          .all()
      : [];
    const earlier = await this.database.client.orm.public.TripCountry.where(
      (link) => link.countryId.in(countryIds),
    )
      .select('countryId', 'tripId')
      .all();
    const tripIds = [...new Set(earlier.map((link) => link.tripId))];
    const earlierTrips = tripIds.length
      ? await this.database.client.orm.public.Trip.where((candidate) =>
          candidate.id.in(tripIds),
        )
          .select('id', 'userId', 'startDate')
          .all()
      : [];
    const revisitedCountryIds = new Set(
      earlier
        .filter((link) =>
          earlierTrips.some(
            (candidate) =>
              candidate.id === link.tripId &&
              candidate.userId === userId &&
              candidate.startDate < trip.startDate &&
              candidate.id !== trip.id,
          ),
        )
        .map((link) => link.countryId),
    );
    const result = {
      ...trip,
      coverUrl: await this.covers.readUrl(
        userId,
        trip.id,
        trip.coverStoragePath,
      ),
      countries,
      isRevisit: revisitedCountryIds.size > 0,
      revisitedCountryIds: [...revisitedCountryIds],
    };
    if (!detail) return result;
    const cityLinks = await this.database.client.orm.public.TripCity.where({
      tripId: trip.id,
    })
      .select('cityId')
      .all();
    const cityIds = cityLinks.map((city) => city.cityId);
    const cities = cityIds.length
      ? await this.database.client.orm.public.City.where((city) =>
          city.id.in(cityIds),
        )
          .select('id', 'countryId', 'name', 'slug', 'latitude', 'longitude')
          .all()
      : [];
    return { ...result, cities };
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
