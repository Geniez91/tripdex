import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../prisma/database.service.js';
import type { ICommunityActivityCursor } from '../dto/community-activity-query.dto.js';
import type { ICommunityActivityRow } from '../types/community-activity-row.js';

@Injectable()
export class CommunityActivityRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(
    limit: number,
    cursor: ICommunityActivityCursor | null,
  ): Promise<ICommunityActivityRow[]> {
    const cursorCreatedAt = cursor?.createdAt ?? '9999-12-31T23:59:59.999Z';
    const cursorId = cursor?.id ?? '';
    const plan = this.database.client.raw.sql`
      WITH page AS (
        SELECT t.id, t."createdAt", t."userId", t.title, t."startDate", t."endDate",
          t.visibility, t.rating, t.review, t."coverStoragePath",
          u.username, u."avatarUrl"
        FROM public.trip t
        JOIN public."user" u ON u.id = t."userId"
        WHERE t.visibility = 'public'
          AND (
            t."createdAt" < ${cursorCreatedAt}::timestamptz
            OR (t."createdAt" = ${cursorCreatedAt}::timestamptz AND 'trip:' || t.id < ${cursorId})
          )
        ORDER BY t."createdAt" DESC, t.id DESC
        LIMIT ${limit + 1}
      )
      SELECT page.id AS "tripId", page."createdAt" AS "activityDate", page."userId",
        page.username, page."avatarUrl", page.title, page."startDate", page."endDate",
        page.rating, page.review, page."coverStoragePath",
        c.id AS "countryId", c.iso2 AS "countryIso2", c.iso3 AS "countryIso3", c.name AS "countryName",
        city.id AS "cityId", city.name AS "cityName"
      FROM page
      JOIN public."tripCountry" tc ON tc."tripId" = page.id
      JOIN public.country c ON c.id = tc."countryId"
      LEFT JOIN public."tripCity" tcity ON tcity."tripId" = page.id
      LEFT JOIN public.city city ON city.id = tcity."cityId"
      ORDER BY page."createdAt" DESC, page.id DESC, c.iso3, city.name
    `
      .returnsRow({
        tripId: 'pg/text@1',
        activityDate: 'pg/timestamptz-string@1',
        userId: 'pg/text@1',
        username: 'pg/text@1',
        avatarUrl: { codecId: 'pg/text@1', nullable: true },
        title: 'pg/text@1',
        startDate: 'pg/timestamptz-string@1',
        endDate: { codecId: 'pg/timestamptz-string@1', nullable: true },
        rating: { codecId: 'pg/float8@1', nullable: true },
        review: { codecId: 'pg/text@1', nullable: true },
        coverStoragePath: { codecId: 'pg/text@1', nullable: true },
        countryId: 'pg/text@1',
        countryIso2: 'pg/text@1',
        countryIso3: 'pg/text@1',
        countryName: 'pg/text@1',
        cityId: { codecId: 'pg/text@1', nullable: true },
        cityName: { codecId: 'pg/text@1', nullable: true },
      })
      .build();
    const rows: ICommunityActivityRow[] = [];
    for await (const row of this.database.client.runtime().query(plan)) {
      rows.push(row);
    }
    return rows;
  }
}
