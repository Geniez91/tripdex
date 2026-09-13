import type { ResidenceResponse } from "~/types/interfaces/community";
import { getResidence } from "~/services/api/profile";

export function useResidence() {
  const api = useTripdexApi();
  const { data: cached } = useNuxtData<ResidenceResponse>("private-residence");
  return useAsyncData("private-residence", () => getResidence(api), {
    server: false,
    getCachedData: (_key, _nuxtApp, context) =>
      context.cause === "initial" ? cached.value ?? undefined : undefined,
  });
}
