import { Injectable } from '@nestjs/common';
import { CommunityRecordMapper } from '../mappers/community-record.mapper.js';
import { DatabaseService } from '../../prisma/database.service.js';
import type {
  CommunityPeriod,
  CommunityRecord,
} from '../types/community-record.js';

@Injectable()
export class CommunityRepository {
  constructor(private readonly database: DatabaseService) {}

  async statistics(
    period: CommunityPeriod,
    originsLimit: number,
  ): Promise<CommunityRecord[]> {
    // One statement / snapshot for the whole world. FILTER DISTINCT and window
    // ranking keep individual users in PostgreSQL; no trip/user rows leave it.
    const plan = this.database.client.raw.sql`
      WITH bounds AS (
        SELECT ${period.start}::timestamptz AS start_year,
               ${period.next}::timestamptz AS next_year,
               ${period.today}::timestamptz AS today
      ), visits AS (
        SELECT tc."countryId", t."userId", u."residenceCountryId",
          (t."startDate" < b.next_year AND COALESCE(t."endDate", t."startDate") >= b.start_year) AS in_year,
          (t."startDate" <= b.today AND t."endDate" >= b.today) AS now
        FROM public.trip t
        JOIN public."tripCountry" tc ON tc."tripId" = t.id
        JOIN public."user" u ON u.id = t."userId"
        CROSS JOIN bounds b
        WHERE (t."startDate" < b.next_year AND COALESCE(t."endDate", t."startDate") >= b.start_year)
           OR (t."startDate" <= b.today AND t."endDate" >= b.today)
      ), totals AS (
        SELECT "countryId", COUNT(DISTINCT "userId") FILTER (WHERE in_year) AS travelers,
          COUNT(DISTINCT "userId") FILTER (WHERE now) AS "travelersNow"
        FROM visits GROUP BY "countryId"
      ), origins AS (
        SELECT "countryId", "residenceCountryId", COUNT(DISTINCT "userId") AS travelers,
          ROW_NUMBER() OVER (PARTITION BY "countryId" ORDER BY COUNT(DISTINCT "userId") DESC, "residenceCountryId") AS rank
        FROM visits WHERE in_year AND "residenceCountryId" IS NOT NULL
        GROUP BY "countryId", "residenceCountryId"
      )
      SELECT c.id, c.iso2, c.iso3, c.name,
        COALESCE(t.travelers, 0) AS travelers, COALESCE(t."travelersNow", 0) AS "travelersNow",
        o.id AS "originId", o.iso2 AS "originIso2", o.iso3 AS "originIso3", o.name AS "originName",
        origins.travelers AS "originTravelers"
      FROM public.country c
      LEFT JOIN totals t ON t."countryId" = c.id
      LEFT JOIN origins ON origins."countryId" = c.id AND origins.rank <= ${originsLimit}
      LEFT JOIN public.country o ON o.id = origins."residenceCountryId"
      ORDER BY c.iso3, origins.rank
    `
      .returnsRow({
        id: 'pg/text@1',
        iso2: 'pg/text@1',
        iso3: 'pg/text@1',
        name: 'pg/text@1',
        travelers: 'pg/int8number@1',
        travelersNow: 'pg/int8number@1',
        originId: { codecId: 'pg/text@1', nullable: true },
        originIso2: { codecId: 'pg/text@1', nullable: true },
        originIso3: { codecId: 'pg/text@1', nullable: true },
        originName: { codecId: 'pg/text@1', nullable: true },
        originTravelers: { codecId: 'pg/int8number@1', nullable: true },
      })
      .build();
    const records: CommunityRecord[] = [];
    for await (const row of this.database.client.runtime().query(plan))
      records.push(CommunityRecordMapper.fromPersistence(row));
    return records;
  }
}
