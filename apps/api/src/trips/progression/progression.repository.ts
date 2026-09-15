import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../prisma/database.service.js';
import type { CountryRecord } from '../types/trip-records.js';
import type {
  ProgressionSnapshot,
  ProgressionTripCountryRow,
} from './progression-records.js';

@Injectable()
export class ProgressionRepository {
  constructor(private readonly database: DatabaseService) {}

  async snapshot(userId: string): Promise<ProgressionSnapshot> {
    const [countries, tripCountries] = await Promise.all([
      this.countries(),
      this.tripCountries(userId),
    ]);

    return { countries, tripCountries };
  }

  private async countries(): Promise<CountryRecord[]> {
    return this.database.client.orm.public.Country.select(
      'id',
      'iso2',
      'iso3',
      'name',
      'slug',
      'continentCode',
    )
      .orderBy((country) => country.name.asc())
      .all();
  }

  private async tripCountries(
    userId: string,
  ): Promise<ProgressionTripCountryRow[]> {
    const plan = this.database.client.raw.sql`
      SELECT
        t.id AS "tripId",
        t."startDate",
        t."endDate",
        tc."countryId",
        tc."arrivalDate"
      FROM public.trip t
      LEFT JOIN public."tripCountry" tc ON tc."tripId" = t.id
      WHERE t."userId" = ${userId}
      ORDER BY t."startDate" ASC, t.id ASC, tc."countryId" ASC
    `
      .returnsRow({
        tripId: 'pg/text@1',
        startDate: 'pg/timestamptz-string@1',
        endDate: { codecId: 'pg/timestamptz-string@1', nullable: true },
        countryId: { codecId: 'pg/text@1', nullable: true },
        arrivalDate: {
          codecId: 'pg/timestamptz-string@1',
          nullable: true,
        },
      })
      .build();
    const rows: ProgressionTripCountryRow[] = [];

    for await (const row of this.database.client.runtime().query(plan)) {
      rows.push(row);
    }

    return rows;
  }
}
