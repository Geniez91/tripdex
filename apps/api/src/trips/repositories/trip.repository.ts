import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../prisma/database.service.js';
import type { CreateTripDto } from '../dto/create-trip.dto.js';
import type {
  CityRecord,
  CountryRecord,
  TripCountryLink,
  TripOwnershipRecord,
  TripRecord,
} from '../types/trip-records.js';

@Injectable()
export class TripRepository {
  constructor(private readonly database: DatabaseService) {}

  async findCountries(ids: string[]): Promise<CountryRecord[]> {
    return this.database.client.orm.public.Country.where((country) =>
      country.id.in(ids),
    )
      .select('id', 'iso2', 'iso3', 'name', 'slug', 'continentCode')
      .all();
  }

  async findCities(ids: string[]): Promise<CityRecord[]> {
    if (!ids.length) return [];
    return this.database.client.orm.public.City.where((city) => city.id.in(ids))
      .select('id', 'countryId', 'name', 'slug', 'latitude', 'longitude')
      .all();
  }

  async create(userId: string, input: CreateTripDto): Promise<TripRecord> {
    return this.database.client.transaction(async (tx) => {
      const trip = await tx.orm.public.Trip.create({
        userId,
        title: input.title,
        startDate: input.startDate,
        endDate: input.endDate,
        rating: input.rating,
        review: input.review,
        coverStoragePath: null,
      });
      for (const countryId of input.countryIds) {
        await tx.orm.public.TripCountry.create({
          tripId: trip.id,
          countryId,
        });
      }
      for (const cityId of input.cityIds) {
        await tx.orm.public.TripCity.create({ tripId: trip.id, cityId });
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
  }

  async listByUser(userId: string): Promise<TripRecord[]> {
    return this.database.client.orm.public.Trip.where({ userId })
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
  }

  async findOwned(userId: string, tripId: string): Promise<TripRecord | null> {
    return this.database.client.orm.public.Trip.where({
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
  }

  async findCountryLinks(tripId: string): Promise<TripCountryLink[]> {
    return this.database.client.orm.public.TripCountry.where({ tripId })
      .select('countryId', 'tripId')
      .all();
  }

  async findEarlierCountryLinks(
    countryIds: string[],
  ): Promise<TripCountryLink[]> {
    if (!countryIds.length) return [];
    return this.database.client.orm.public.TripCountry.where((link) =>
      link.countryId.in(countryIds),
    )
      .select('countryId', 'tripId')
      .all();
  }

  async findTripOwnership(tripIds: string[]): Promise<TripOwnershipRecord[]> {
    if (!tripIds.length) return [];
    return this.database.client.orm.public.Trip.where((trip) =>
      trip.id.in(tripIds),
    )
      .select('id', 'userId', 'startDate')
      .all();
  }

  async findCityIds(tripId: string): Promise<string[]> {
    const links = await this.database.client.orm.public.TripCity.where({
      tripId,
    })
      .select('cityId')
      .all();
    return links.map((link) => link.cityId);
  }

  async findVisitedCountries(userId: string): Promise<CountryRecord[]> {
    return this.database.client.orm.public.Country.where((country) =>
      country.tripCountries.some((link) =>
        link.trip.some((trip) => trip.userId.eq(userId)),
      ),
    )
      .select('id', 'iso2', 'iso3', 'name', 'slug', 'continentCode')
      .orderBy((country) => country.name.asc())
      .all();
  }
}
