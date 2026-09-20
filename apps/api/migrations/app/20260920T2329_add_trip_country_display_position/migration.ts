#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1273dac3f4a52ea218b71d2d1995c8b4e8d9ed6df2297b8252ec6e2413da52a9/contract';
import endContract from '../../snapshots/1273dac3f4a52ea218b71d2d1995c8b4e8d9ed6df2297b8252ec6e2413da52a9/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/972b17073e6c58a686ad786480387e9b3d3afeeca3e70f25a23d764628110535/contract';
import startContract from '../../snapshots/972b17073e6c58a686ad786480387e9b3d3afeeca3e70f25a23d764628110535/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';
import postgresStatic from '@prisma/orm-postgres/static';

const db = postgresStatic<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'tripCountry',
        column: col('position', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-tripCountry-position', {
        check: () =>
          db.raw.sql`
            SELECT "tripId"
            FROM "public"."tripCountry"
            WHERE "position" IS NULL
            LIMIT 1
          `.returnsRow({ tripId: 'pg/uuid@1' }),
        run: () =>
          db.raw.sql`
            WITH ranked_countries AS (
              SELECT
                "tripCountry"."tripId",
                "tripCountry"."countryId",
                ROW_NUMBER() OVER (
                  PARTITION BY "tripCountry"."tripId"
                  ORDER BY "country"."iso3" ASC
                ) - 1 AS "position"
              FROM "public"."tripCountry"
              INNER JOIN "public"."country"
                ON "country"."id" = "tripCountry"."countryId"
            )
            UPDATE "public"."tripCountry"
            SET "position" = ranked_countries."position"
            FROM ranked_countries
            WHERE "tripCountry"."tripId" = ranked_countries."tripId"
              AND "tripCountry"."countryId" = ranked_countries."countryId"
              AND "tripCountry"."position" IS NULL
          `.affectedCount(),
      }),
      this.setNotNull({ schema: 'public', table: 'tripCountry', column: 'position' }),
      this.addUnique({
        schema: 'public',
        table: 'tripCountry',
        constraint: 'tripCountry_tripId_position_key',
        columns: ['tripId', 'position'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
