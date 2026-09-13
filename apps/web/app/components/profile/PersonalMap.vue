<script setup lang="ts">
import type { Country } from "~/types/tripdex";
import type { MapCountryAppearance } from "~/types/interfaces/map";
const props = defineProps<{
  countries: Country[];
  visitedIso3: string[];
  loading: boolean;
  available: boolean;
}>();
const { data: residence } = useResidence();
const home = computed(() => residence.value?.residenceCountry ?? null);
const residenceColor = "#B97864";
const appearances = computed<Record<string, MapCountryAppearance>>(() => {
  const visited = new Set(props.visitedIso3);
  return Object.fromEntries(props.countries.map(country => {
    const isHome = country.id === home.value?.id;
    const visitLabel = visited.has(country.iso3) ? "Visité" : "À découvrir";
    return [country.iso3, {
      fill: isHome ? residenceColor : visited.has(country.iso3)
        ? "rgb(var(--v-theme-map-visited))" : "rgb(var(--v-theme-map-land))",
      description: isHome ? `Ton pays de résidence · ${visitLabel}` : visitLabel,
    }];
  }));
});
</script>
<template>
  <WorldMap class="personal-map" :countries="countries" :visited-iso3="visitedIso3"
    :loading="loading" :available="available" :appearances="appearances">
    <template #legend>
      <div class="map-legend">
        <span><i aria-hidden="true" />À découvrir</span>
        <span><i class="legend-visited" aria-hidden="true" />Visité</span>
        <span v-if="home"><i :style="{ background: residenceColor }" aria-hidden="true" />Résidence · {{ home.name }}</span>
      </div>
    </template>
  </WorldMap>
</template>
<style scoped>
/* Keep residence identifiable even when the same country is also visited. */
.personal-map :deep(.map-country.customized),
.personal-map :deep(.map-marker.customized) { fill: var(--country-fill); }
.map-legend { flex-wrap: wrap; }
</style>
