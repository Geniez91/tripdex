import type { CommunityStatistics } from "~/types/interfaces/community";
import type { CommunityActivityResponse } from "~/types/interfaces/community";
import type { CommunityCountryExplorer } from "~/types/interfaces/community-country-explorer";
import { apiUrl } from "./api-url";

export function getCommunityStatistics(
  baseURL: string,
  year: number,
): Promise<CommunityStatistics> {
  return $fetch<CommunityStatistics>(apiUrl(baseURL, "/community/countries"), {
    query: { year: String(year).padStart(4, "0") },
    retry: 0,
  });
}

export function getCommunityActivity(
  baseURL: string,
  cursor?: string | null,
  limit = 10,
): Promise<CommunityActivityResponse> {
  return $fetch<CommunityActivityResponse>(apiUrl(baseURL, "/community/activity"), {
    query: { limit, ...(cursor ? { cursor } : {}) },
    retry: 0,
  });
}

export function getCommunityCountryExplorer(
  baseURL: string,
  countryCode: string,
  signal?: AbortSignal,
): Promise<CommunityCountryExplorer> {
  return $fetch<CommunityCountryExplorer>(
    apiUrl(baseURL, `/community/countries/${encodeURIComponent(countryCode)}`),
    { signal, retry: 0 },
  );
}
