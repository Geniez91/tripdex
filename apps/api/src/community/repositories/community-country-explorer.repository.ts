import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../prisma/database.service.js';
import type { ICommunityCountryExplorerRecord } from '../types/community-country-explorer-record.js';

@Injectable()
export class CommunityCountryExplorerRepository {
  constructor(private readonly database: DatabaseService) {}

  async detail(
    countryCode: string,
    today: string,
  ): Promise<ICommunityCountryExplorerRecord[]> {
    const plan = this.database.client.raw.sql`
      WITH target AS (
        SELECT id, iso2, iso3, name
        FROM public.country
        WHERE iso3 = ${countryCode}
      ), stats AS (
        SELECT
          COUNT(DISTINCT t."userId") AS travelers,
          COUNT(DISTINCT t."userId") FILTER (
            WHERE t."startDate" <= ${`${today}T00:00:00.000Z`}::timestamptz
              AND t."endDate" >= ${`${today}T00:00:00.000Z`}::timestamptz
          ) AS "travelersNow",
          AVG(t.rating) FILTER (WHERE t.visibility = 'public') AS "averageRating",
          COUNT(t.rating) FILTER (WHERE t.visibility = 'public') AS "ratingCount"
        FROM target c
        LEFT JOIN public."tripCountry" tc ON tc."countryId" = c.id
        LEFT JOIN public.trip t ON t.id = tc."tripId"
      ), recent AS (
        SELECT t.id, t.title, t."createdAt", t."startDate", t."endDate",
          t.rating, t.review, t."coverStoragePath", t."userId", u.username
        FROM target c
        JOIN public."tripCountry" tc ON tc."countryId" = c.id
        JOIN public.trip t ON t.id = tc."tripId" AND t.visibility = 'public'
        JOIN public."user" u ON u.id = t."userId"
        ORDER BY t."createdAt" DESC, t.id DESC
        LIMIT 4
      )
      SELECT c.id AS "countryId", c.iso2, c.iso3, c.name,
        stats.travelers, stats."travelersNow", stats."averageRating", stats."ratingCount",
        recent.id AS "tripId", recent.title AS "tripTitle",
        recent."createdAt" AS "tripCreatedAt", recent."startDate" AS "tripStartDate",
        recent."endDate" AS "tripEndDate", recent.rating AS "tripRating",
        recent.review AS "tripReview", recent."coverStoragePath",
        recent.username, recent."userId" AS "tripUserId"
      FROM target c
      CROSS JOIN stats
      LEFT JOIN recent ON TRUE
      ORDER BY recent."createdAt" DESC, recent.id DESC
    `
      .returnsRow({
        countryId: 'pg/text@1',
        iso2: 'pg/text@1',
        iso3: 'pg/text@1',
        name: 'pg/text@1',
        travelers: 'pg/int8number@1',
        travelersNow: 'pg/int8number@1',
        averageRating: { codecId: 'pg/float8@1', nullable: true },
        ratingCount: 'pg/int8number@1',
        tripId: { codecId: 'pg/text@1', nullable: true },
        tripTitle: { codecId: 'pg/text@1', nullable: true },
        tripCreatedAt: { codecId: 'pg/timestamptz-string@1', nullable: true },
        tripStartDate: { codecId: 'pg/timestamptz-string@1', nullable: true },
        tripEndDate: { codecId: 'pg/timestamptz-string@1', nullable: true },
        tripRating: { codecId: 'pg/float8@1', nullable: true },
        tripReview: { codecId: 'pg/text@1', nullable: true },
        coverStoragePath: { codecId: 'pg/text@1', nullable: true },
        username: { codecId: 'pg/text@1', nullable: true },
        tripUserId: { codecId: 'pg/text@1', nullable: true },
      })
      .build();
    const records: ICommunityCountryExplorerRecord[] = [];
    for await (const row of this.database.client.runtime().query(plan)) {
      records.push(row);
    }
    return records;
  }
}
