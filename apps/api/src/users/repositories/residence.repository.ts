import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../prisma/database.service.js';
import type { ICountryRecord } from '../../countries/types/country-record.js';

@Injectable()
export class ResidenceRepository {
  constructor(private readonly database: DatabaseService) {}

  async findUser(
    userId: string,
  ): Promise<{ residenceCountryId: string | null } | null> {
    return this.database.client.orm.public.User.where({ id: userId })
      .select('residenceCountryId')
      .first();
  }

  async findCountry(id: string): Promise<ICountryRecord | null> {
    return this.database.client.orm.public.Country.where({ id })
      .select('id', 'iso2', 'iso3', 'name', 'slug', 'continentCode')
      .first();
  }

  async update(
    userId: string,
    residenceCountryId: string | null,
  ): Promise<boolean> {
    const rows = await this.database.client.orm.public.User.where({
      id: userId,
    }).update({ residenceCountryId });
    return rows !== null;
  }
}
