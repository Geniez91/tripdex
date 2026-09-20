import { calculateProgression } from './progression-calculations.js';
import type { IProgressionSnapshot } from './progression-records.js';

const countries = [
  {
    id: 'fr',
    iso2: 'FR',
    iso3: 'FRA',
    name: 'France',
    slug: 'france',
    continentCode: 'EU',
  },
  {
    id: 'it',
    iso2: 'IT',
    iso3: 'ITA',
    name: 'Italy',
    slug: 'italy',
    continentCode: 'EU',
  },
  {
    id: 'jp',
    iso2: 'JP',
    iso3: 'JPN',
    name: 'Japan',
    slug: 'japan',
    continentCode: 'AS',
  },
  {
    id: 'ca',
    iso2: 'CA',
    iso3: 'CAN',
    name: 'Canada',
    slug: 'canada',
    continentCode: 'NA',
  },
];

function record(
  tripId: string,
  startDate: string,
  endDate: string | null,
  countryId: string | null,
  arrivalDate: string | null = null,
) {
  return { tripId, startDate, endDate, countryId, arrivalDate };
}

function snapshot(
  tripCountries: IProgressionSnapshot['tripCountries'] = [],
  countryRecords: IProgressionSnapshot['countries'] = countries,
): IProgressionSnapshot {
  return { countries: countryRecords, tripCountries };
}

describe('calculateProgression', () => {
  it('returns an empty progression and the dynamic country denominator without trips', () => {
    // Arrange
    const input = snapshot([], countries.slice(0, 3));

    // Act
    const result = calculateProgression(input, 2026);

    // Assert
    expect(result.summary).toEqual({
      visitedCountries: 0,
      totalCountries: 3,
      worldCompletionPercentage: 0,
      exploredContinents: 0,
      revisitedCountries: 0,
      totalRevisits: 0,
      totalTravelDays: 0,
    });
    expect(result.timeline.countries).toEqual([]);
    expect(result.timeline.travelDays).toEqual([]);
  });

  it('counts a start-only trip as one civil travel day and one visited country', () => {
    // Arrange
    const input = snapshot([record('trip-1', '2026-04-01T00:00:00.000Z', null, 'jp')]);

    // Act
    const result = calculateProgression(input, 2026);

    // Assert
    expect(result.summary.visitedCountries).toBe(1);
    expect(result.summary.totalTravelDays).toBe(1);
    expect(result.summary.worldCompletionPercentage).toBe(25);
  });

  it('accepts Postgres timestamptz-string dates returned by the progression query', () => {
    // Arrange
    const input = snapshot([
      record(
        'trip-1',
        '2026-04-01 00:00:00+00',
        '2026-04-03 00:00:00+00',
        'jp',
      ),
    ]);

    // Act
    const result = calculateProgression(input, 2026);

    // Assert
    expect(result.summary.visitedCountries).toBe(1);
    expect(result.summary.exploredContinents).toBe(1);
    expect(result.summary.totalTravelDays).toBe(3);
    expect(result.timeline.countries).toEqual([
      { year: 2026, visitedCountries: 1 },
    ]);
  });

  it('counts distinct countries across multi-country trips and counts each trip once per country', () => {
    // Arrange
    const input = snapshot([
      record('multi', '2024-06-10T00:00:00.000Z', '2024-06-12T00:00:00.000Z', 'fr'),
      record('multi', '2024-06-10T00:00:00.000Z', '2024-06-12T00:00:00.000Z', 'it'),
      record('multi', '2024-06-10T00:00:00.000Z', '2024-06-12T00:00:00.000Z', 'fr'),
    ]);

    // Act
    const result = calculateProgression(input, 2026);

    // Assert
    expect(result.summary.visitedCountries).toBe(2);
    expect(result.summary.totalTravelDays).toBe(3);
    expect(result.revisits).toEqual([]);
  });

  it('counts repeat trips as revisits without inflating unique country progress', () => {
    // Arrange
    const input = snapshot([
      record('fr-1', '2022-05-01T00:00:00.000Z', '2022-05-02T00:00:00.000Z', 'fr'),
      record('fr-2', '2024-05-01T00:00:00.000Z', '2024-05-02T00:00:00.000Z', 'fr'),
      record('jp-1', '2024-06-01T00:00:00.000Z', null, 'jp'),
    ]);

    // Act
    const result = calculateProgression(input, 2026);

    // Assert
    expect(result.summary.visitedCountries).toBe(2);
    expect(result.summary.revisitedCountries).toBe(1);
    expect(result.summary.totalRevisits).toBe(1);
    expect(result.revisits).toEqual([
      expect.objectContaining({ country: expect.objectContaining({ id: 'fr' }), tripCount: 2 }),
    ]);
  });

  it('does not treat equal trip start dates as revisits', () => {
    // Arrange
    const input = snapshot([
      record('fr-1', '2024-05-01T00:00:00.000Z', null, 'fr'),
      record('fr-2', '2024-05-01T00:00:00.000Z', null, 'fr'),
    ]);

    // Act
    const result = calculateProgression(input, 2024);

    // Assert
    expect(result.summary.revisitedCountries).toBe(0);
    expect(result.summary.totalRevisits).toBe(0);
    expect(result.revisits).toEqual([]);
    expect(result.timeline.yearlyVisits).toEqual([
      { year: 2024, newCountries: 1, revisits: 0 },
    ]);
  });

  it('sums multiple revisits across countries deterministically', () => {
    // Arrange
    const input = snapshot([
      record('jp-1', '2020-01-01T00:00:00.000Z', null, 'jp'),
      record('jp-2', '2021-01-01T00:00:00.000Z', null, 'jp'),
      record('jp-3', '2023-01-01T00:00:00.000Z', null, 'jp'),
      record('fr-1', '2020-01-01T00:00:00.000Z', null, 'fr'),
      record('fr-2', '2022-01-01T00:00:00.000Z', null, 'fr'),
      record('it-1', '2022-01-01T00:00:00.000Z', null, 'it'),
    ]);

    // Act
    const result = calculateProgression(input, 2026);

    // Assert
    expect(result.summary.revisitedCountries).toBe(2);
    expect(result.summary.totalRevisits).toBe(3);
  });

  it('sorts revisit results by country name independently of input order', () => {
    // Arrange
    const input = snapshot([
      record('jp-1', '2020-01-01T00:00:00.000Z', null, 'jp'),
      record('jp-2', '2021-01-01T00:00:00.000Z', null, 'jp'),
      record('fr-1', '2020-01-01T00:00:00.000Z', null, 'fr'),
      record('fr-2', '2021-01-01T00:00:00.000Z', null, 'fr'),
    ]);

    // Act
    const result = calculateProgression(input, 2026);

    // Assert
    expect(result.revisits.map((revisit) => revisit.country.id)).toEqual(['fr', 'jp']);
  });

  it('does not infer a visit from an unlinked residence country', () => {
    // Arrange
    const input = snapshot([], countries);

    // Act
    const result = calculateProgression(input, 2026);

    // Assert
    expect(result.summary.visitedCountries).toBe(0);
    expect(result.continents.every((continent) => continent.visitedCountries === 0)).toBe(true);
  });

  it('aggregates continent totals from the supplied country reference', () => {
    // Arrange
    const input = snapshot([
      record('fr-1', '2025-01-01T00:00:00.000Z', null, 'fr'),
      record('jp-1', '2025-02-01T00:00:00.000Z', null, 'jp'),
    ]);

    // Act
    const result = calculateProgression(input, 2026);

    // Assert
    expect(result.summary.exploredContinents).toBe(2);
    expect(result.continents).toEqual([
      { continentCode: 'AS', visitedCountries: 1, totalCountries: 1, completionPercentage: 100 },
      { continentCode: 'EU', visitedCountries: 1, totalCountries: 2, completionPercentage: 50 },
      { continentCode: 'NA', visitedCountries: 0, totalCountries: 1, completionPercentage: 0 },
    ]);
  });

  it('rounds percentages to one decimal place while retaining count fields', () => {
    // Arrange
    const input = snapshot(
      [record('fr-1', '2025-01-01T00:00:00.000Z', null, 'fr')],
      countries.slice(0, 3),
    );

    // Act
    const result = calculateProgression(input, 2026);

    // Assert
    expect(result.summary.worldCompletionPercentage).toBe(33.3);
    expect(result.continents.find((item) => item.continentCode === 'EU')?.completionPercentage).toBe(50);
  });

  it('counts both endpoints of a civil trip period', () => {
    // Arrange
    const input = snapshot([record('trip', '2026-09-10T00:00:00.000Z', '2026-09-12T00:00:00.000Z', 'fr')]);

    // Act
    const result = calculateProgression(input, 2026);

    // Assert
    expect(result.summary.totalTravelDays).toBe(3);
  });

  it('splits an inclusive trip period at the calendar year boundary', () => {
    // Arrange
    const input = snapshot([record('trip', '2024-12-29T00:00:00.000Z', '2025-01-03T00:00:00.000Z', 'fr')]);

    // Act
    const result = calculateProgression(input, 2025);

    // Assert
    expect(result.summary.totalTravelDays).toBe(6);
    expect(result.timeline.travelDays).toEqual([
      { year: 2024, travelDays: 3 },
      { year: 2025, travelDays: 3 },
    ]);
  });

  it('merges overlapping trip periods before computing unique travel days', () => {
    // Arrange
    const input = snapshot([
      record('first', '2026-08-01T00:00:00.000Z', '2026-08-05T00:00:00.000Z', 'fr'),
      record('second', '2026-08-04T00:00:00.000Z', '2026-08-08T00:00:00.000Z', 'it'),
    ]);

    // Act
    const result = calculateProgression(input, 2026);

    // Assert
    expect(result.summary.totalTravelDays).toBe(8);
    expect(result.timeline.travelDays.find((item) => item.year === 2026)?.travelDays).toBe(8);
  });

  it('uses per-country arrival dates when present and trip start dates otherwise', () => {
    // Arrange
    const input = snapshot([
      record('multi', '2022-12-29T00:00:00.000Z', '2023-01-02T00:00:00.000Z', 'fr'),
      record('multi', '2022-12-29T00:00:00.000Z', '2023-01-02T00:00:00.000Z', 'jp', '2023-01-01T00:00:00.000Z'),
    ]);

    // Act
    const result = calculateProgression(input, 2023);

    // Assert
    expect(result.timeline.countries).toEqual([
      { year: 2022, visitedCountries: 1 },
      { year: 2023, visitedCountries: 2 },
    ]);
  });

  it('returns cumulative country totals for each year through the current year', () => {
    // Arrange
    const input = snapshot([
      record('fr', '2022-01-01T00:00:00.000Z', null, 'fr'),
      record('it', '2024-01-01T00:00:00.000Z', null, 'it'),
    ]);

    // Act
    const result = calculateProgression(input, 2025);

    // Assert
    expect(result.timeline.countries).toEqual([
      { year: 2022, visitedCountries: 1 },
      { year: 2023, visitedCountries: 1 },
      { year: 2024, visitedCountries: 2 },
      { year: 2025, visitedCountries: 2 },
    ]);
  });

  it('separates each country first visit from later trip revisits by year', () => {
    // Arrange
    const input = snapshot([
      record('fr-1', '2022-05-01T00:00:00.000Z', null, 'fr'),
      record('fr-2', '2023-01-01T00:00:00.000Z', null, 'fr'),
      record('fr-3', '2023-12-01T00:00:00.000Z', null, 'fr'),
      record('jp-1', '2023-06-01T00:00:00.000Z', null, 'jp'),
    ]);

    // Act
    const result = calculateProgression(input, 2024);

    // Assert
    expect(result.timeline.yearlyVisits).toEqual([
      { year: 2022, newCountries: 1, revisits: 0 },
      { year: 2023, newCountries: 1, revisits: 2 },
      { year: 2024, newCountries: 0, revisits: 0 },
    ]);
  });
});
