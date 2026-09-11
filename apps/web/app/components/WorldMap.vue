<script setup lang="ts">
import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import type {
  MapProperties,
  MapShape,
  MapCountryAppearance,
} from "~/types/interfaces/map";
import type { Country } from "~/types/tripdex";
import CountryFlag from "~/components/tripdex/CountryFlag.vue";
import { getWorldGeometry } from "~/services/api/geography";

const props = defineProps<{
  visitedIso3: string[];
  loading: boolean;
  available: boolean;
  countries?: Country[];
  appearances?: Record<string, MapCountryAppearance>;
  selectedIso3?: string | null;
  scrollable?: boolean;
}>();
const emit = defineEmits<{ select: [iso3: string | null] }>();
const { data, error, status, refresh } = await useAsyncData<
  FeatureCollection<Geometry, MapProperties>
>("world-geometry", (_nuxtApp, { signal }) => getWorldGeometry(signal), {
  server: false,
  deep: false,
});
const visited = computed<Set<string>>(() => new Set(props.visitedIso3));
// Keep the raw geometry identity used by the selected-state comparisons.
const active = shallowRef<MapProperties | null>(null);
const shown = computed<MapProperties | null>(
  () =>
    active.value ??
    data.value?.features.find(
      (feature) => feature.properties.iso3 === props.selectedIso3,
    )?.properties ??
    null,
);
// The existing API reference supplies ISO2; the geometry contract stays unchanged.
const countryByIso3 = computed<Map<string, Country>>(
  () =>
    new Map((props.countries ?? []).map((country) => [country.iso3, country])),
);
const activeCountry = computed<Country | undefined>(() =>
  shown.value?.iso3 ? countryByIso3.value.get(shown.value.iso3) : undefined,
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
const anchors = computed<Map<string, [number, number]>>(
  () =>
    new Map(
      (data.value?.features ?? []).flatMap((feature) => {
        const point = projection(feature.properties.label);
        return feature.properties.iso3 && point
          ? [[feature.properties.iso3, point]]
          : [];
      }),
    ),
);
function drawRoute(originIso3: string, destinationIso3: string): string {
  const origin = anchors.value.get(originIso3);
  const destination = anchors.value.get(destinationIso3);
  if (!origin || !destination) return "";
  const dx = destination[0] - origin[0];
  const dy = destination[1] - origin[1];
  const distance = Math.hypot(dx, dy);
  if (!distance) return `M ${origin[0]} ${origin[1]}`;
  const bend = Math.min(80, Math.max(18, distance * 0.18));
  const controlX = (origin[0] + destination[0]) / 2 - (dy / distance) * bend;
  const controlY = (origin[1] + destination[1]) / 2 + (dx / distance) * bend;
  return `M ${origin[0]} ${origin[1]} Q ${controlX} ${controlY} ${destination[0]} ${destination[1]}`;
}
function isSelected(properties: MapProperties): boolean {
  return props.selectedIso3 === undefined
    ? active.value === properties
    : properties.iso3 !== null && props.selectedIso3 === properties.iso3;
}
function selectCountry(properties: MapProperties): void {
  active.value = properties;
  emit("select", properties.iso3);
}
function clearPreview(): void {
  if (props.selectedIso3 !== undefined) active.value = null;
}
function countryStyle(iso3: string | null): Record<string, string> {
  const appearance = iso3 ? props.appearances?.[iso3] : undefined;
  return appearance ? { "--country-fill": appearance.fill } : {};
}
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
  if (props.appearances)
    return props.appearances[iso3]?.description ?? "Statistiques indisponibles";
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
    <div
      v-else
      :class="{ 'map-scroll': scrollable }"
      :tabindex="scrollable ? 0 : undefined"
      :role="scrollable ? 'region' : undefined"
      :aria-label="
        scrollable
          ? 'Carte du monde, défilement horizontal possible'
          : undefined
      "
    >
      <svg
        viewBox="0 0 960 506"
        class="map-svg"
        role="group"
        aria-label="Carte interactive des pays"
        :aria-busy="loading"
        @mouseleave="clearPreview"
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
              selected: isSelected(shape.properties),
              customized: !!appearances,
            }"
            :style="countryStyle(shape.properties.iso3)"
            :data-iso3="shape.properties.iso3"
            :aria-pressed="isSelected(shape.properties)"
            :tabindex="shape.marker ? -1 : 0"
            role="button"
            :aria-label="`${shape.properties.name} — ${countryState(shape.properties.iso3)}`"
            @mouseenter="active = shape.properties"
            @focus="active = shape.properties"
            @blur="clearPreview"
            @click="selectCountry(shape.properties)"
            @keydown.enter.prevent="selectCountry(shape.properties)"
            @keydown.space.prevent="selectCountry(shape.properties)"
          >
            <title>
              {{ shape.properties.name }} ·
              {{ countryState(shape.properties.iso3) }}
            </title>
          </path>
        </g>
        <slot name="routes" :anchors="anchors" :draw-route="drawRoute" />
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
              selected: isSelected(shape.properties),
              customized: !!appearances,
            }"
            :style="countryStyle(shape.properties.iso3)"
            :data-iso3="shape.properties.iso3"
            :aria-pressed="isSelected(shape.properties)"
            tabindex="0"
            role="button"
            :aria-label="`${shape.properties.name} — ${countryState(shape.properties.iso3)}`"
            @mouseenter="active = shape.properties"
            @focus="active = shape.properties"
            @blur="clearPreview"
            @click="selectCountry(shape.properties)"
            @keydown.enter.prevent="selectCountry(shape.properties)"
            @keydown.space.prevent="selectCountry(shape.properties)"
          >
            <title>
              {{ shape.properties.name }} ·
              {{ countryState(shape.properties.iso3) }}
            </title>
          </circle>
        </template>
        <slot name="annotations" :anchors="anchors" />
      </svg>
    </div>
    <div class="map-caption" aria-live="polite">
      <p v-if="shown">
        <CountryFlag
          v-if="activeCountry"
          :iso2="activeCountry.iso2"
          :name="shown.name"
        />
        <strong>{{ shown.name }}</strong
        ><span>{{
          loading ? "Chargement du statut…" : countryState(shown.iso3)
        }}</span>
      </p>
      <p v-else>
        <span>Survolez ou sélectionnez un pays pour l’explorer.</span>
      </p>
      <slot name="legend"
        ><div class="map-legend">
          <span><i aria-hidden="true" />{{ "À découvrir" }}</span>
          <span
            ><i class="legend-visited" aria-hidden="true" />{{ "Visité" }}</span
          >
          <span><i class="legend-selected" aria-hidden="true" />Sélection</span>
        </div></slot
      >
    </div>
    <slot name="country-details" :iso3="shown?.iso3 ?? null" />
  </div>
</template>

<style scoped>
.customized {
  fill: var(--country-fill, rgb(var(--v-theme-map-land)));
}
.customized:hover,
.customized.active,
.customized:focus-visible {
  fill: rgb(var(--v-theme-map-selected));
}
.map-country.selected,
.map-marker.selected {
  stroke: rgb(var(--v-theme-ink));
  stroke-width: 2;
}
.map-scroll:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
@media (max-width: 600px) {
  .map-scroll {
    overflow-x: auto;
    overscroll-behavior-x: contain;
  }
  .map-scroll .map-svg {
    width: 640px;
    min-height: 337px;
    max-width: none;
  }
}
</style>
