import { TripMapper } from '../mappers/trip.mapper.js';
import type { CountryRecord } from '../types/trip-records.js';
import type { ProgressionResponseDto } from './dto/progression-response.dto.js';
import type {
  ProgressionSnapshot,
  ProgressionTripCountryRow,
} from './progression-records.js';

const MILLISECONDS_PER_DAY = 86_400_000;

interface CivilDate {
  day: number;
  year: number;
}

interface TripPeriod {
  startDay: number;
  endDay: number;
}

interface CountryTrip {
  tripId: string;
  visitDate: CivilDate;
}

function civilDate(value: string): CivilDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(year, month - 1, date);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== date
  ) {
    return null;
  }

  return {
    day: Math.floor(parsed.getTime() / MILLISECONDS_PER_DAY),
    year,
  };
}

function countryEntryDateFromArrivalOrTripStart(
  row: ProgressionTripCountryRow,
): CivilDate | null {
  return civilDate(row.arrivalDate ?? row.startDate);
}

function tripPeriod(row: ProgressionTripCountryRow): TripPeriod | null {
  const start = civilDate(row.startDate);
  const end = civilDate(row.endDate ?? row.startDate);
  if (!start || !end || end.day < start.day) return null;
  return { startDay: start.day, endDay: end.day };
}

function completionPercentage(visited: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((visited / total) * 1000) / 10;
}

function uniqueTripsById(
  rows: ProgressionTripCountryRow[],
): Map<string, ProgressionTripCountryRow> {
  const trips = new Map<string, ProgressionTripCountryRow>();
  for (const row of rows) {
    if (!trips.has(row.tripId)) trips.set(row.tripId, row);
  }
  return trips;
}

function mergePeriods(periods: TripPeriod[]): TripPeriod[] {
  const ordered = [...periods].sort(
    (left, right) => left.startDay - right.startDay || left.endDay - right.endDay,
  );
  const merged: TripPeriod[] = [];

  for (const period of ordered) {
    const previous = merged.at(-1);
    if (!previous || period.startDay > previous.endDay + 1) {
      merged.push({ ...period });
      continue;
    }
    previous.endDay = Math.max(previous.endDay, period.endDay);
  }

  return merged;
}

function dayNumber(year: number, month: number, day: number): number {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month, day);
  return Math.floor(date.getTime() / MILLISECONDS_PER_DAY);
}

function yearForDay(day: number): number {
  return new Date(day * MILLISECONDS_PER_DAY).getUTCFullYear();
}

function mergedTravelDaysByYear(periods: TripPeriod[]): Map<number, number> {
  const days = new Map<number, number>();
  for (const period of mergePeriods(periods)) {
    let firstYear = yearForDay(period.startDay);
    const lastYear = yearForDay(period.endDay);
    while (firstYear <= lastYear) {
      const yearStart = dayNumber(firstYear, 0, 1);
      const nextYearStart = dayNumber(firstYear + 1, 0, 1);
      const yearEnd = nextYearStart - 1;
      const overlapStart = Math.max(period.startDay, yearStart);
      const overlapEnd = Math.min(period.endDay, yearEnd);
      days.set(
        firstYear,
        (days.get(firstYear) ?? 0) + overlapEnd - overlapStart + 1,
      );
      firstYear += 1;
    }
  }
  return days;
}

function countriesById(countries: CountryRecord[]): Map<string, CountryRecord> {
  return new Map(countries.map((country) => [country.id, country]));
}

function countryTripsById(
  rows: ProgressionTripCountryRow[],
  validCountryIds: Set<string>,
): Map<string, CountryTrip[]> {
  const trips = new Map<string, CountryTrip[]>();
  const seen = new Set<string>();

  for (const row of rows) {
    if (!row.countryId || !validCountryIds.has(row.countryId)) continue;
    const uniqueKey = `${row.tripId}\u0000${row.countryId}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    const visitDate = countryEntryDateFromArrivalOrTripStart(row);
    if (!visitDate) continue;
    const countryTrips = trips.get(row.countryId) ?? [];
    countryTrips.push({ tripId: row.tripId, visitDate });
    trips.set(row.countryId, countryTrips);
  }

  for (const countryTrips of trips.values()) {
    countryTrips.sort(
      (left, right) =>
        left.visitDate.day - right.visitDate.day ||
        left.tripId.localeCompare(right.tripId),
    );
  }

  return trips;
}

function yearlyVisitCounts(
  countryTrips: Map<string, CountryTrip[]>,
  firstYear: number | null,
  lastYear: number | null,
): ProgressionResponseDto['timeline']['yearlyVisits'] {
  if (firstYear === null || lastYear === null) return [];
  const counts = new Map<number, { newCountries: number; revisits: number }>();

  for (const trips of countryTrips.values()) {
    trips.forEach((trip, index) => {
      const current = counts.get(trip.visitDate.year) ?? {
        newCountries: 0,
        revisits: 0,
      };
      if (index === 0) current.newCountries += 1;
      else current.revisits += 1;
      counts.set(trip.visitDate.year, current);
    });
  }

  const result: ProgressionResponseDto['timeline']['yearlyVisits'] = [];
  for (let year = firstYear; year <= lastYear; year += 1) {
    const current = counts.get(year) ?? { newCountries: 0, revisits: 0 };
    result.push({ year, ...current });
  }
  return result;
}

function countryTimeline(
  countryTrips: Map<string, CountryTrip[]>,
  firstYear: number | null,
  lastYear: number | null,
): ProgressionResponseDto['timeline']['countries'] {
  if (firstYear === null || lastYear === null) return [];
  const countriesPerYear = new Map<number, number>();
  for (const trips of countryTrips.values()) {
    const firstTrip = trips[0];
    if (firstTrip) {
      countriesPerYear.set(
        firstTrip.visitDate.year,
        (countriesPerYear.get(firstTrip.visitDate.year) ?? 0) + 1,
      );
    }
  }

  const result: ProgressionResponseDto['timeline']['countries'] = [];
  let visitedCountries = 0;
  for (let year = firstYear; year <= lastYear; year += 1) {
    visitedCountries += countriesPerYear.get(year) ?? 0;
    result.push({ year, visitedCountries });
  }
  return result;
}

function continentProgress(
  countries: CountryRecord[],
  visitedCountryIds: Set<string>,
): ProgressionResponseDto['continents'] {
  const totals = new Map<string, { totalCountries: number; visitedCountries: number }>();
  for (const country of countries) {
    const counts = totals.get(country.continentCode) ?? {
      totalCountries: 0,
      visitedCountries: 0,
    };
    counts.totalCountries += 1;
    if (visitedCountryIds.has(country.id)) counts.visitedCountries += 1;
    totals.set(country.continentCode, counts);
  }

  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([continentCode, counts]) => ({
      continentCode,
      ...counts,
      completionPercentage: completionPercentage(
        counts.visitedCountries,
        counts.totalCountries,
      ),
    }));
}

export function calculateProgression(
  snapshot: ProgressionSnapshot,
  asOfYear: number,
): ProgressionResponseDto {
  const countriesByCountryId = countriesById(snapshot.countries);
  const countryTrips = countryTripsById(
    snapshot.tripCountries,
    new Set(countriesByCountryId.keys()),
  );
  const visitedCountryIds = new Set(countryTrips.keys());
  const tripRows = uniqueTripsById(snapshot.tripCountries);
  const travelDaysByYear = mergedTravelDaysByYear(
    [...tripRows.values()].flatMap((row) => {
      const period = tripPeriod(row);
      return period ? [period] : [];
    }),
  );

  const revisits: ProgressionResponseDto['revisits'] = [];
  for (const [countryId, trips] of countryTrips.entries()) {
    const country = countriesByCountryId.get(countryId);
    if (country && trips.length >= 2) {
      revisits.push({
        country: TripMapper.toCountryDto(country),
        tripCount: trips.length,
      });
    }
  }
  revisits.sort(
      (left, right) =>
        left.country.name.localeCompare(right.country.name) ||
        left.country.id.localeCompare(right.country.id),
  );
  const totalRevisits = revisits.reduce(
    (total, revisit) => total + revisit.tripCount - 1,
    0,
  );
  const continents = continentProgress(snapshot.countries, visitedCountryIds);
  const exploredContinents = continents.filter(
    (continent) => continent.visitedCountries > 0,
  ).length;
  const allVisitYears = [...countryTrips.values()].flatMap((trips) =>
    trips.map((trip) => trip.visitDate.year),
  );
  const allPeriodYears = [...travelDaysByYear.keys()];
  const firstYearCandidates = [...allVisitYears, ...allPeriodYears];
  const firstYear = firstYearCandidates.reduce<number | null>(
    (first, year) => (first === null ? year : Math.min(first, year)),
    null,
  );
  const lastYear =
    firstYear === null
      ? null
      : [...allVisitYears, ...allPeriodYears].reduce(
          (last, year) => Math.max(last, year),
          asOfYear,
        );

  return {
    summary: {
      visitedCountries: visitedCountryIds.size,
      totalCountries: snapshot.countries.length,
      worldCompletionPercentage: completionPercentage(
        visitedCountryIds.size,
        snapshot.countries.length,
      ),
      exploredContinents,
      revisitedCountries: revisits.length,
      totalRevisits,
      totalTravelDays: [...travelDaysByYear.values()].reduce(
        (total, days) => total + days,
        0,
      ),
    },
    continents,
    revisits,
    timeline: {
      countries: countryTimeline(countryTrips, firstYear, lastYear),
      travelDays: firstYear === null || lastYear === null
        ? []
        : Array.from({ length: lastYear - firstYear + 1 }, (_, index) => {
            const year = firstYear + index;
            return { year, travelDays: travelDaysByYear.get(year) ?? 0 };
          }),
      yearlyVisits: yearlyVisitCounts(countryTrips, firstYear, lastYear),
    },
  };
}
