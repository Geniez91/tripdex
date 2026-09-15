import type { City } from "~/types/tripdex";
import { apiUrl } from "./api-url";

export function getCities(
  baseURL: string,
  signal?: AbortSignal,
): Promise<City[]> {
  return $fetch<City[]>(apiUrl(baseURL, "/cities"), { signal });
}
