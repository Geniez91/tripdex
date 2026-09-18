import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../prisma/database.service.js';
import { ProgressionRepository } from '../trips/progression/progression.repository.js';
import type {
  ICommunityAchievementCounts,
  ICommunityAchievementStats,
} from './achievement.types.js';

@Injectable()
export class AchievementsRepository {
  constructor(
    private readonly progression: ProgressionRepository,
    private readonly database: DatabaseService,
  ) {}

  snapshot(userId: string) {
    return this.progression.snapshot(userId);
  }

  async communityCounts(userId: string): Promise<ICommunityAchievementCounts> {
    const plan = this.database.client.raw.sql`
      SELECT
        (SELECT COUNT(*) FROM public."photoContestVote" WHERE "userId" = ${userId}) AS "voteCount",
        (SELECT COUNT(*)
         FROM public."photoContest" contest
         JOIN public."photoContestSubmission" submission
           ON submission.id = contest."winnerSubmissionId"
         WHERE contest.status = 'CLOSED' AND submission."userId" = ${userId}) AS "winCount"
    `
      .returnsRow({ voteCount: 'pg/int8number@1', winCount: 'pg/int8number@1' })
      .build();
    for await (const row of this.database.client.runtime().query(plan)) return row;
    return { voteCount: 0, winCount: 0 };
  }

   private buildCommunityStatsPlan() {
    return this.database.client.raw.sql`
      WITH trip_facts AS (
        SELECT "userId", COUNT(*) AS "tripCount"
        FROM public.trip
        GROUP BY "userId"
      ), country_trips AS (
        SELECT t."userId", tc."countryId", COUNT(*) AS "tripCount"
        FROM public.trip t
        JOIN public."tripCountry" tc ON tc."tripId" = t.id
        GROUP BY t."userId", tc."countryId"
      ), country_facts AS (
        SELECT "userId", COUNT(*) AS "visitedCountryCount",
          SUM("tripCount" - 1) FILTER (WHERE "tripCount" >= 2) AS "totalRevisits",
          MAX("tripCount") AS "maxTripsInSameCountry"
        FROM country_trips GROUP BY "userId"
      ), continent_facts AS (
        SELECT country_trips."userId", COUNT(DISTINCT c."continentCode") AS "exploredContinentCount",
          COUNT(*) FILTER (WHERE c."continentCode" = 'AF') AS af,
          COUNT(*) FILTER (WHERE c."continentCode" = 'AS') AS asia,
          COUNT(*) FILTER (WHERE c."continentCode" = 'EU') AS eu,
          COUNT(*) FILTER (WHERE c."continentCode" = 'NA') AS na,
          COUNT(*) FILTER (WHERE c."continentCode" = 'SA') AS sa,
          COUNT(*) FILTER (WHERE c."continentCode" = 'OC') AS oc,
          COUNT(*) FILTER (WHERE c."continentCode" = 'AN') AS an
        FROM country_trips
        JOIN public.country c ON c.id = country_trips."countryId"
        GROUP BY country_trips."userId"
      ), ordered_periods AS (
        SELECT t."userId", t.id, t."startDate"::date AS "startDay",
          COALESCE(t."endDate", t."startDate")::date AS "endDay",
          MAX(COALESCE(t."endDate", t."startDate")::date) OVER (
            PARTITION BY t."userId" ORDER BY t."startDate"::date,
              COALESCE(t."endDate", t."startDate")::date, t.id
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          ) AS "previousEndDay"
        FROM public.trip t
      ), period_groups AS (
        SELECT *, SUM(CASE WHEN "previousEndDay" IS NULL OR "startDay" > "previousEndDay" + 1
          THEN 1 ELSE 0 END) OVER (
            PARTITION BY "userId" ORDER BY "startDay", "endDay", id
            ROWS UNBOUNDED PRECEDING
          ) AS "groupId"
        FROM ordered_periods
      ), merged_periods AS (
        SELECT "userId", "groupId", MIN("startDay") AS "startDay", MAX("endDay") AS "endDay"
        FROM period_groups GROUP BY "userId", "groupId"
      ), travel_days AS (
        SELECT "userId", SUM(("endDay" - "startDay") + 1) AS "totalTravelDays"
        FROM merged_periods GROUP BY "userId"
      ), voters AS (
        SELECT "userId", COUNT(*) AS "voteCount"
        FROM public."photoContestVote" GROUP BY "userId"
      ), winners AS (
        SELECT submission."userId", COUNT(*) AS "winCount"
        FROM public."photoContest" contest
        JOIN public."photoContestSubmission" submission ON submission.id = contest."winnerSubmissionId"
        WHERE contest.status = 'CLOSED'
        GROUP BY submission."userId"
      ), facts AS (
        SELECT trip_facts."userId", trip_facts."tripCount",
          COALESCE(country_facts."visitedCountryCount", 0) AS "visitedCountryCount",
          COALESCE(country_facts."totalRevisits", 0) AS "totalRevisits",
          COALESCE(country_facts."maxTripsInSameCountry", 0) AS "maxTripsInSameCountry",
          COALESCE(continent_facts."exploredContinentCount", 0) AS "exploredContinentCount",
          COALESCE(continent_facts.af, 0) AS af, COALESCE(continent_facts.asia, 0) AS asia,
          COALESCE(continent_facts.eu, 0) AS eu, COALESCE(continent_facts.na, 0) AS na,
          COALESCE(continent_facts.sa, 0) AS sa, COALESCE(continent_facts.oc, 0) AS oc,
          COALESCE(continent_facts.an, 0) AS an,
          COALESCE(travel_days."totalTravelDays", 0) AS "totalTravelDays",
          COALESCE(voters."voteCount", 0) AS "voteCount", COALESCE(winners."winCount", 0) AS "winCount"
        FROM trip_facts
        LEFT JOIN country_facts ON country_facts."userId" = trip_facts."userId"
        LEFT JOIN continent_facts ON continent_facts."userId" = trip_facts."userId"
        LEFT JOIN travel_days ON travel_days."userId" = trip_facts."userId"
        LEFT JOIN voters ON voters."userId" = trip_facts."userId"
        LEFT JOIN winners ON winners."userId" = trip_facts."userId"
      )
      SELECT COUNT(*) AS "eligibleUserCount",
        COUNT(*) FILTER (WHERE "tripCount" >= 1) AS "premierVoyage",
        COUNT(*) FILTER (WHERE "visitedCountryCount" >= 1) AS "premierPas",
        COUNT(*) FILTER (WHERE "visitedCountryCount" >= 10) AS "globeTrotter",
        COUNT(*) FILTER (WHERE "visitedCountryCount" >= 25) AS "grandExplorateur",
        COUNT(*) FILTER (WHERE eu > 0) AS "premiersPasEurope", COUNT(*) FILTER (WHERE af > 0) AS "premiersPasAfrique",
        COUNT(*) FILTER (WHERE asia > 0) AS "premiersPasAsie", COUNT(*) FILTER (WHERE na > 0) AS "premiersPasAmeriqueNord",
        COUNT(*) FILTER (WHERE sa > 0) AS "premiersPasAmeriqueSud", COUNT(*) FILTER (WHERE oc > 0) AS "premiersPasOceanie",
        COUNT(*) FILTER (WHERE an > 0) AS "premiersPasAntarctique",
        COUNT(*) FILTER (WHERE "exploredContinentCount" >= 2) AS "nouveauContinent",
        COUNT(*) FILTER (WHERE "exploredContinentCount" >= 3) AS "troisHorizons",
        COUNT(*) FILTER (WHERE "totalRevisits" >= 1) AS "dejaVu",
        COUNT(*) FILTER (WHERE "maxTripsInSameCountry" >= 3) AS "cantStayAway",
        COUNT(*) FILTER (WHERE "totalTravelDays" >= 30) AS "trenteJoursAilleurs",
        COUNT(*) FILTER (WHERE "totalTravelDays" >= 100) AS "centJoursSurLaRoute",
        COUNT(*) FILTER (WHERE "voteCount" >= 1) AS "laVoixDuVoyageur",
        COUNT(*) FILTER (WHERE "winCount" >= 1) AS "photographeTripdex"
      FROM facts
    `
      .returnsRow({
        eligibleUserCount: 'pg/int8number@1', premierVoyage: 'pg/int8number@1', premierPas: 'pg/int8number@1',
        globeTrotter: 'pg/int8number@1', grandExplorateur: 'pg/int8number@1', premiersPasEurope: 'pg/int8number@1',
        premiersPasAfrique: 'pg/int8number@1', premiersPasAsie: 'pg/int8number@1', premiersPasAmeriqueNord: 'pg/int8number@1',
        premiersPasAmeriqueSud: 'pg/int8number@1', premiersPasOceanie: 'pg/int8number@1', premiersPasAntarctique: 'pg/int8number@1',
        nouveauContinent: 'pg/int8number@1', troisHorizons: 'pg/int8number@1', dejaVu: 'pg/int8number@1',
        cantStayAway: 'pg/int8number@1', trenteJoursAilleurs: 'pg/int8number@1', centJoursSurLaRoute: 'pg/int8number@1',
        laVoixDuVoyageur: 'pg/int8number@1', photographeTripdex: 'pg/int8number@1',
      })
      .build();
  }

  async communityStats(): Promise<ICommunityAchievementStats> {
    const plan = this.buildCommunityStatsPlan();
    for await (const row of this.database.client.runtime().query(plan)) {
      const { eligibleUserCount, ...holderCounts } = row;
      return {
        eligibleUserCount,
        holderCounts: {
          PREMIER_VOYAGE: holderCounts.premierVoyage,
          PREMIER_PAS: holderCounts.premierPas,
          GLOBE_TROTTER: holderCounts.globeTrotter,
          GRAND_EXPLORATEUR: holderCounts.grandExplorateur,
          PREMIERS_PAS_EUROPE: holderCounts.premiersPasEurope,
          PREMIERS_PAS_AFRIQUE: holderCounts.premiersPasAfrique,
          PREMIERS_PAS_ASIE: holderCounts.premiersPasAsie,
          PREMIERS_PAS_AMERIQUE_NORD: holderCounts.premiersPasAmeriqueNord,
          PREMIERS_PAS_AMERIQUE_SUD: holderCounts.premiersPasAmeriqueSud,
          PREMIERS_PAS_OCEANIE: holderCounts.premiersPasOceanie,
          PREMIERS_PAS_ANTARCTIQUE: holderCounts.premiersPasAntarctique,
          NOUVEAU_CONTINENT: holderCounts.nouveauContinent,
          TROIS_HORIZONS: holderCounts.troisHorizons,
          DEJA_VU: holderCounts.dejaVu,
          CANT_STAY_AWAY: holderCounts.cantStayAway,
          TRENTE_JOURS_AILLEURS: holderCounts.trenteJoursAilleurs,
          CENT_JOURS_SUR_LA_ROUTE: holderCounts.centJoursSurLaRoute,
          LA_VOIX_DU_VOYAGEUR: holderCounts.laVoixDuVoyageur,
          PHOTOGRAPHE_TRIPDEX: holderCounts.photographeTripdex,
        },
      };
    }
    return { eligibleUserCount: 0, holderCounts: {} };
  }
}
