import type { Country } from "~/types/tripdex";

export function getCountries(
  baseURL: string,
  signal?: AbortSignal,
): Promise<Country[]> {
  return $fetch<Country[]>("/countries", { baseURL, signal });
}
