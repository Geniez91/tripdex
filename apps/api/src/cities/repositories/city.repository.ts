import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../prisma/database.service.js';
import type { ICityRecord } from '../types/city-record.js';
import type { ICityRepositoryPort } from '../types/city-repository.port.js';

@Injectable()
export class CityRepository implements ICityRepositoryPort {
  constructor(private readonly database: DatabaseService) {}

  async findAll(countryId?: string, query?: string): Promise<ICityRecord[]> {
    let cities = this.database.client.orm.public.City.select(
      'id',
      'countryId',
      'name',
      'slug',
      'latitude',
      'longitude',
    );
    if (countryId) cities = cities.where({ countryId });
    if (query) cities = cities.where((city) => city.name.ilike(`%${query}%`));
    return await cities
      .orderBy((city) => city.name.asc())
      .limit(50)
      .all();
  }
}
