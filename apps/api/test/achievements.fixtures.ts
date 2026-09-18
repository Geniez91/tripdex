import type { IProgressionSnapshot } from '../src/trips/progression/progression-records.js';

const achievementFixtureCountries = [
  {
    id: 'fr',
    iso2: 'FR',
    iso3: 'FRA',
    name: 'France',
    slug: 'france',
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
] satisfies IProgressionSnapshot['countries'];

export function createAchievementTestSnapshot(
  tripCountries: IProgressionSnapshot['tripCountries'],
): IProgressionSnapshot {
  return {
    countries: achievementFixtureCountries.map((country) => ({ ...country })),
    tripCountries: tripCountries.map((tripCountry) => ({ ...tripCountry })),
  };
}
