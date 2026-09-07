import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../prisma/database.service.js';

@Injectable()
export class CitiesService {
  constructor(private readonly database: DatabaseService) {}

  async list(countryId?: string, query?: string) {
    let cities = this.database.client.orm.public.City.select(
      'id',
      'countryId',
      'name',
      'slug',
      'latitude',
      'longitude',
    );
    if (countryId) cities = cities.where({ countryId });
    const normalized = query?.trim();
    if (normalized) {
      cities = cities.where((city) => city.name.ilike(`%${normalized}%`));
    }
    return cities
      .orderBy((city) => city.name.asc())
      .limit(50)
      .all();
  }
}
