import type { Ref } from "vue";
import type { City } from "~/types/tripdex";
import { getCities } from "~/services/api/cities";

export function useCountryCities(
  countryId: Ref<string | null>,
  baseURL: string,
) {
  const cities = ref<City[]>([]);
  const loading = ref(false);
  const failed = ref(false);
  let controller: AbortController | null = null;
  let requestVersion = 0;

  async function load(): Promise<void> {
    const requestedCountryId = countryId.value;
    const version = ++requestVersion;
    controller?.abort();
    if (!requestedCountryId) {
      cities.value = [];
      loading.value = false;
      failed.value = false;
      return;
    }
    const nextController = new AbortController();
    controller = nextController;
    cities.value = [];
    loading.value = true;
    failed.value = false;
    try {
      const result = await getCities(baseURL, requestedCountryId, nextController.signal);
      if (nextController.signal.aborted || version !== requestVersion) return;
      cities.value = result;
    } catch {
      if (!nextController.signal.aborted && version === requestVersion) {
        failed.value = true;
      }
    } finally {
      if (!nextController.signal.aborted && version === requestVersion) {
        loading.value = false;
      }
    }
  }

  watch(countryId, () => void load(), { immediate: true });
  onBeforeUnmount(() => controller?.abort());

  return { cities, loading, failed, reload: load };
}
