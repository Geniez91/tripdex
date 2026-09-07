import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateTripDto } from './dto/create-trip.dto.js';
import type {
  CountryResponseDto,
  TripResponseDto,
} from './dto/trip-response.dto.js';
import { TripMapper } from './mappers/trip.mapper.js';
import { TripRepository } from './repositories/trip.repository.js';
import type { TripRecord } from './types/trip-records.js';
import { TripCoversService } from './trip-covers.service.js';

@Injectable()
export class TripsService {
  constructor(
    private readonly trips: TripRepository,
    private readonly covers: TripCoversService,
  ) {}

  async create(userId: string, input: CreateTripDto): Promise<TripResponseDto> {
    const countries = await this.trips.findCountries(input.countryIds);
    if (countries.length !== input.countryIds.length) {
      throw new BadRequestException('One or more countries do not exist.');
    }
    const cities = await this.trips.findCities(input.cityIds);
    if (cities.length !== input.cityIds.length) {
      throw new BadRequestException('One or more cities do not exist.');
    }
    const selectedCountryIds = new Set(input.countryIds);
    if (cities.some((city) => !selectedCountryIds.has(city.countryId))) {
      throw new BadRequestException(
        'Each city must belong to a selected country.',
      );
    }

    const trip = await this.trips.create(userId, input);
    return this.toResponse(userId, trip, true);
  }

  async journal(userId: string): Promise<TripResponseDto[]> {
    const trips = await this.trips.listByUser(userId);
    return Promise.all(
      trips.map((trip) => this.toResponse(userId, trip, false)),
    );
  }

  async detail(userId: string, tripId: string): Promise<TripResponseDto> {
    const trip = await this.trips.findOwned(userId, tripId);
    if (!trip) throw new NotFoundException('Trip not found.');
    return this.toResponse(userId, trip, true);
  }

  async visitedCountries(userId: string): Promise<CountryResponseDto[]> {
    const countries = await this.trips.findVisitedCountries(userId);
    return countries.map((country) => TripMapper.toCountryDto(country));
  }

  private async toResponse(
    userId: string,
    trip: TripRecord,
    includeCities: boolean,
  ): Promise<TripResponseDto> {
    const countryLinks = await this.trips.findCountryLinks(trip.id);
    const countryIds = countryLinks.map((link) => link.countryId);
    const countries = await this.trips.findCountries(countryIds);
    const earlierLinks = await this.trips.findEarlierCountryLinks(countryIds);
    const earlierTripIds = [
      ...new Set(earlierLinks.map((link) => link.tripId)),
    ];
    const earlierTrips = await this.trips.findTripOwnership(earlierTripIds);
    const revisitedCountryIds = new Set(
      earlierLinks
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
    const cityIds = includeCities ? await this.trips.findCityIds(trip.id) : [];
    const cities = includeCities
      ? await this.trips.findCities(cityIds)
      : undefined;

    return TripMapper.toResponse({
      trip,
      countries,
      cities,
      coverUrl: await this.covers.readUrl(
        userId,
        trip.id,
        trip.coverStoragePath,
      ),
      isRevisit: revisitedCountryIds.size > 0,
      revisitedCountryIds: [...revisitedCountryIds],
    });
  }
}
