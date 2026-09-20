import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ICreateTripDto } from './dto/create-trip.dto.js';
import type {
  ICountryResponseDto,
  ITripResponseDto,
} from './dto/trip-response.dto.js';
import { TripMapper } from './mappers/trip.mapper.js';
import { TripRepository } from './repositories/trip.repository.js';
import type { ITripRecord } from './types/trip-records.js';
import { TripCoversService } from './trip-covers.service.js';
import { LOGGER_CONTEXT } from '../logger.constants.js';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(LOGGER_CONTEXT.TRIPS_SERVICE);

  constructor(
    private readonly trips: TripRepository,
    private readonly covers: TripCoversService,
  ) {}

  async create(userId: string, input: ICreateTripDto): Promise<ITripResponseDto> {
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
    this.logger.log('Trip created.');
    return this.toResponse(userId, trip, true);
  }

  async journal(userId: string): Promise<ITripResponseDto[]> {
    const trips = await this.trips.listByUser(userId);
    return Promise.all(
      trips.map((trip) => this.toResponse(userId, trip, false)),
    );
  }

  async detail(userId: string, tripId: string): Promise<ITripResponseDto> {
    const trip = await this.trips.findOwned(userId, tripId);
    if (!trip) throw new NotFoundException('Trip not found.');
    return this.toResponse(userId, trip, true);
  }

  async visitedCountries(userId: string): Promise<ICountryResponseDto[]> {
    const countries = await this.trips.findVisitedCountries(userId);
    return countries.map((country) => TripMapper.toCountryDto(country));
  }

  private async toResponse(
    userId: string,
    trip: ITripRecord,
    includeCities: boolean,
  ): Promise<ITripResponseDto> {
    const countryLinks = await this.trips.findCountryLinks(trip.id);
    const countryIds = countryLinks.map((link) => link.countryId);
    const countries = await this.trips.findCountries(countryIds);
    const countriesById = new Map(
      countries.map((country) => [country.id, country]),
    );
    const revisitedCountryIds = new Set(
      await this.trips.findRevisitedCountryIds(
        userId,
        trip.startDate,
        countryIds,
      ),
    );
    const tripCountries = countryLinks.map((link) => {
      const country = countriesById.get(link.countryId);
      if (!country) {
        throw new Error('Trip country relation refers to a missing country.');
      }
      return {
        country,
        position: link.position,
        isRevisit: revisitedCountryIds.has(link.countryId),
      };
    });
    const cityIds = includeCities ? await this.trips.findCityIds(trip.id) : [];
    const cities = includeCities
      ? await this.trips.findCities(cityIds)
      : undefined;

    return TripMapper.toResponse({
      trip,
      countries: tripCountries,
      cities,
      coverUrl: await this.covers.readUrl(
        userId,
        trip.id,
        trip.coverStoragePath,
      ),
      containsRevisit: tripCountries.some((country) => country.isRevisit),
    });
  }
}
