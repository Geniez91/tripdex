import type { Country } from "~/types/tripdex";
import { apiUrl } from "./api-url";

export function getCountries(
  baseURL: string,
  signal?: AbortSignal,
): Promise<Country[]> {
  return $fetch<Country[]>(apiUrl(baseURL, "/countries"), { signal });
}
