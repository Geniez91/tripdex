import type { CommunityStatistics } from "~/types/interfaces/community";

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
