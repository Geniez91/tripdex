import { ownsCoverPath } from '../../trips/cover-file.js';

export interface WeeklyCandidate {
  countryId: string; countryCode: string; countryName: string;
  tripId: string; userId: string; visibility: string;
  coverStoragePath: string | null; createdAt: string;
}
export function weeklyPeriod(now: Date): { key: string; start: string; end: string } {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  return { key: start.toISOString().slice(0, 10), start: start.toISOString(),
    end: new Date(start.getTime() + 7 * 86_400_000).toISOString() };
}
function timestamp(value: string): bigint {
  const fraction = (value.match(/\.(\d+)/)?.[1] ?? '').padEnd(6, '0');
  return BigInt(Date.parse(value)) * 1000n + BigInt(fraction.slice(3, 6));
}
export function rankWeeklyCandidates(candidates: WeeklyCandidate[], previousCountryId: string | null): WeeklyCandidate[] {
  return candidates.filter(candidate => {
    if (candidate.countryId === previousCountryId || candidate.visibility !== 'public' ||
      !candidate.coverStoragePath || !candidate.userId || !Number.isFinite(Date.parse(candidate.createdAt))) return false;
    try { return ownsCoverPath(candidate.userId, candidate.tripId, candidate.coverStoragePath); }
    catch { return false; }
  }).sort((a, b) => {
    const left = timestamp(a.createdAt), right = timestamp(b.createdAt);
    if (left !== right) return left > right ? -1 : 1;
    return a.countryCode < b.countryCode ? -1 : a.countryCode > b.countryCode ? 1 :
      a.countryId < b.countryId ? -1 : a.countryId > b.countryId ? 1 :
      a.tripId < b.tripId ? -1 : a.tripId > b.tripId ? 1 : 0;
  });
}
