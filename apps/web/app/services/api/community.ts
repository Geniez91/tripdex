import type { CommunityStatistics } from "~/types/interfaces/community";
import type { CommunityActivityResponse } from "~/types/interfaces/community";

export function getCommunityStatistics(
  baseURL: string,
  year: number,
): Promise<CommunityStatistics> {
  return $fetch<CommunityStatistics>("/community/countries", {
    baseURL,
    query: { year: String(year).padStart(4, "0") },
    retry: 0,
  });
}

export function getCommunityActivity(
  baseURL: string,
  cursor?: string | null,
  limit = 10,
): Promise<CommunityActivityResponse> {
  return $fetch<CommunityActivityResponse>("/community/activity", {
    baseURL,
    query: { limit, ...(cursor ? { cursor } : {}) },
    retry: 0,
  });
}
