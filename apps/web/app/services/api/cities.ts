import type { City } from "~/types/tripdex";
import { apiUrl } from "./api-url";

export function getCities(
  baseURL: string,
  countryId: string,
  signal?: AbortSignal,
  query?: string,
): Promise<City[]> {
  const url = new URL(apiUrl(baseURL, "/cities"));
  url.searchParams.set("countryId", countryId);
  const normalizedQuery = query?.trim();
  if (normalizedQuery) url.searchParams.set("q", normalizedQuery);
  return $fetch<City[]>(url.toString(), { signal });
}
