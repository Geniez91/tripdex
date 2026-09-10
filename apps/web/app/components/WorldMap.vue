<script setup lang="ts">
import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import type { MapProperties, MapShape } from "~/types/interfaces/map";
import type { Country } from "~/types/tripdex";
import CountryFlag from "~/components/tripdex/CountryFlag.vue";

const props = defineProps<{
  visitedIso3: string[];
  loading: boolean;
  available: boolean;
  countries?: Country[];
}>();
const { data, error, status, refresh } = await useFetch<
  FeatureCollection<Geometry, MapProperties>
>("/maps/world.json", { server: false, deep: false });
const visited = computed<Set<string>>(() => new Set(props.visitedIso3));
// Keep the raw geometry identity used by the selected-state comparisons.
const active = shallowRef<MapProperties | null>(null);
// The existing API reference supplies ISO2; the geometry contract stays unchanged.
const countryByIso3 = computed<Map<string, Country>>(
  () =>
    new Map((props.countries ?? []).map((country) => [country.iso3, country])),
);
const activeCountry = computed<Country | undefined>(() =>
  active.value?.iso3 ? countryByIso3.value.get(active.value.iso3) : undefined,
);
const projection = geoNaturalEarth1().fitExtent(
  [
    [18, 18],
    [942, 488],
  ],
  { type: "Sphere" },
);
const path = geoPath(projection).digits(2);
const outline = path({ type: "Sphere" }) ?? "";
const graticule = path(geoGraticule10()) ?? "";
const shapes = computed<MapShape[]>(() =>
  (data.value?.features ?? []).map((feature) => ({
    id: feature.id,
    properties: feature.properties,
    path: path(feature) ?? "",
    marker:
      feature.geometry.type === "Point" || path.area(feature) < 10
        ? projection(feature.properties.label)
        : null,
  })),
);
function countryState(iso3: string | null): string {
  if (!iso3) return "Sans correspondance ISO";
  if (!props.available) return "Statut indisponible";
  return visited.value.has(iso3) ? "Visité" : "À découvrir";
}
</script>

<template>
  <div class="world-map">
    <div v-if="error" class="map-placeholder" role="alert">
      <p>Impossible de charger la carte.</p>
      <button class="text-button" @click="refresh()">Réessayer</button>
    </div>
    <div v-else-if="status !== 'success'" class="map-placeholder" role="status">
      La carte prend forme…
    </div>
    <svg
      v-else
      viewBox="0 0 960 506"
      class="map-svg"
      role="group"
      aria-label="Carte interactive des pays"
      :aria-busy="loading"
    >
      <path :d="outline" class="map-ocean" />
      <path :d="graticule" class="map-grid" />
      <g v-for="shape in shapes" :key="shape.id">
        <path
          :d="shape.path"
          class="map-country"
          :class="{
            visited:
              shape.properties.iso3 && visited.has(shape.properties.iso3),
            active: active === shape.properties,
          }"
          :data-iso3="shape.properties.iso3"
          :aria-pressed="active === shape.properties"
          :tabindex="shape.marker ? -1 : 0"
          role="button"
          :aria-label="`${shape.properties.name} — ${countryState(shape.properties.iso3)}`"
          @mouseenter="active = shape.properties"
          @focus="active = shape.properties"
          @click="active = shape.properties"
          @keydown.enter.prevent="active = shape.properties"
          @keydown.space.prevent="active = shape.properties"
        >
          <title>
            {{ shape.properties.name }} ·
            {{ countryState(shape.properties.iso3) }}
          </title>
        </path>
      </g>
      <template v-for="shape in shapes" :key="`marker-${shape.id}`">
        <circle
          v-if="shape.marker"
          :cx="shape.marker[0]"
          :cy="shape.marker[1]"
          r="3.5"
          class="map-marker"
          :class="{
            visited:
              shape.properties.iso3 && visited.has(shape.properties.iso3),
            active: active === shape.properties,
          }"
          :data-iso3="shape.properties.iso3"
          :aria-pressed="active === shape.properties"
          tabindex="0"
          role="button"
          :aria-label="`${shape.properties.name} — ${countryState(shape.properties.iso3)}`"
          @mouseenter="active = shape.properties"
          @focus="active = shape.properties"
          @click="active = shape.properties"
          @keydown.enter.prevent="active = shape.properties"
          @keydown.space.prevent="active = shape.properties"
        >
          <title>
            {{ shape.properties.name }} ·
            {{ countryState(shape.properties.iso3) }}
          </title>
        </circle>
      </template>
    </svg>
    <div class="map-caption" aria-live="polite">
      <p v-if="active">
        <CountryFlag
          v-if="activeCountry"
          :iso2="activeCountry.iso2"
          :name="active.name"
        />
        <strong>{{ active.name }}</strong
        ><span>{{
          loading ? "Chargement du statut…" : countryState(active.iso3)
        }}</span>
      </p>
      <p v-else>
        <span>Survolez ou sélectionnez un pays pour l’explorer.</span>
      </p>
      <div class="map-legend">
        <span><i aria-hidden="true" />À découvrir</span>
        <span><i class="legend-visited" aria-hidden="true" />Visité</span>
        <span><i class="legend-selected" aria-hidden="true" />Sélection</span>
      </div>
    </div>
  </div>
</template>
