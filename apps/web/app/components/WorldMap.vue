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
import {
  type MapZoomTransform,
  fitMapBounds,
  worldTransform,
  resizeMapTransform,
  MAP_VIEWBOX,
  zoomAroundPoint,
} from "~/services/mapZoom";

const props = defineProps<{
  visitedIso3: string[];
  loading: boolean;
  available: boolean;
  countries?: Country[];
  appearances?: Record<string, MapCountryAppearance>;
  selectedIso3?: string | null;
  scrollable?: boolean;
  zoomable?: boolean;
}>();
const emit = defineEmits<{ select: [iso3: string | null] }>();
const viewportElement = ref<HTMLElement | null>(null);
const viewport = ref({ width: Number(MAP_VIEWBOX.width), height: Number(MAP_VIEWBOX.height) });
const zoom = computed(() => zoomTransform.value.k);
let observer: ResizeObserver | undefined;
let animation = 0;
let cameraMotion: { start: MapZoomTransform; target: MapZoomTransform } | null = null;
function stopAnimation(): void {
  cancelAnimationFrame(animation);
  cameraMotion = null;
}
function moveCamera(target: MapZoomTransform): void {
  // The controlled selection watcher can request the same destination as reset.
  if (cameraMotion && target.x === cameraMotion.target.x &&
    target.y === cameraMotion.target.y && target.k === cameraMotion.target.k) return;
  stopAnimation();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    zoomTransform.value = target;
    return;
  }
  const motion = { start: { ...zoomTransform.value }, target };
  cameraMotion = motion;
  const started = performance.now();
  function frame(now: number): void {
    if (cameraMotion !== motion) return;
    const t = Math.min(1, (now - started) / 450);
    const ease = t * t * (3 - 2 * t);
    const { start, target: destination } = motion;
    zoomTransform.value = t === 1 ? { ...destination } : {
      x: start.x + (destination.x - start.x) * ease,
      y: start.y + (destination.y - start.y) * ease,
      k: start.k + (destination.k - start.k) * ease };
    if (t < 1) animation = requestAnimationFrame(frame);
    else cameraMotion = null;
  }
  animation = requestAnimationFrame(frame);
}
watch(viewportElement, (element) => {
  observer?.disconnect();
  if (!element || !props.zoomable) return;
  observer = new ResizeObserver(([entry]) => {
    if (!entry || entry.contentRect.width <= 0 || entry.contentRect.width === viewport.value.width) return;
    const width = entry.contentRect.width;
    const next = { width, height: width * MAP_VIEWBOX.height / MAP_VIEWBOX.width };
    // Reproject both endpoints without cancelling or restarting the current motion.
    if (cameraMotion) {
      cameraMotion.start = resizeMapTransform(cameraMotion.start, viewport.value, next);
      cameraMotion.target = resizeMapTransform(cameraMotion.target, viewport.value, next);
    }
    zoomTransform.value = resizeMapTransform(zoomTransform.value, viewport.value, next);
    viewport.value = next;
  });
  observer.observe(element);
}, { flush: "post" });
onBeforeUnmount(() => { observer?.disconnect(); stopAnimation(); });
const zoomTransform = ref({ x: 0, y: 0, k: 1 });
const renderedZoomTransform = computed(
  () =>
    `translate(${zoomTransform.value.x} ${zoomTransform.value.y}) scale(${zoomTransform.value.k})`,
);
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
    (props.selectedIso3 ? data.value?.features.find(
      (feature) => feature.properties.iso3 === props.selectedIso3,
    )?.properties : null) ??
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
const projection = computed(() => geoNaturalEarth1().fitExtent(
  [
    [0, 0],
    [viewport.value.width, viewport.value.height],
  ],
  { type: "Sphere" },
));
const path = computed(() => geoPath(projection.value).digits(2));
const outline = computed(() => path.value({ type: "Sphere" }) ?? "");
const graticule = computed(() => path.value(geoGraticule10()) ?? "");
function focusCountry(iso3: string | null | undefined): void {
  if (!props.zoomable) return;
  // A cleared selection is World, never a geometry with an unassigned ISO code.
  const feature = iso3 ? data.value?.features.find(feature => feature.properties.iso3 === iso3) : undefined;
  moveCamera(feature ? fitMapBounds(path.value.bounds(feature), viewport.value) : worldTransform());
}
watch(() => props.selectedIso3, focusCountry);
watch(data, () => { if (props.selectedIso3) focusCountry(props.selectedIso3); });
function returnWorld(): void {
  active.value = null;
  emit("select", null);
  moveCamera(worldTransform());
}
const anchors = computed<Map<string, [number, number]>>(
  () =>
    new Map(
      (data.value?.features ?? []).flatMap((feature) => {
        const point = projection.value(feature.properties.label);
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
  if (props.selectedIso3 === undefined || props.selectedIso3 === properties.iso3) focusCountry(properties.iso3);
  emit("select", properties.iso3);
}
function selectIso3(iso3: string): void {
  const properties = data.value?.features.find(feature => feature.properties.iso3 === iso3)?.properties;
  if (properties) selectCountry(properties);
}
function setZoom(scale: number, point = { x: viewport.value.width / 2, y: viewport.value.height / 2 }): void {
  stopAnimation();
  zoomTransform.value = zoomAroundPoint(zoomTransform.value, scale, point);
}
function svgPoint(event: MouseEvent): { x: number; y: number } {
  const matrix = (event.currentTarget as SVGSVGElement).getScreenCTM();
  const point = new DOMPoint(event.clientX, event.clientY);
  return matrix ? point.matrixTransform(matrix.inverse()) : point;
}
function handleWheel(event: WheelEvent): void {
  if (!props.zoomable) return;
  event.preventDefault();
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.value.height : 1);
  setZoom(zoom.value * Math.exp(-delta * 0.002), svgPoint(event));
}
let drag: { id: number; point: { x: number; y: number }; clientX: number; clientY: number } | null = null;
let dragged = false;
function startPan(event: PointerEvent): void {
  if (!props.zoomable || event.button !== 0 || !event.isPrimary) return;
  stopAnimation();
  dragged = false;
  drag = { id: event.pointerId, point: svgPoint(event), clientX: event.clientX, clientY: event.clientY };
}
function pan(event: PointerEvent): void {
  if (!drag || drag.id !== event.pointerId) return;
  const point = svgPoint(event);
  if (!dragged && Math.hypot(event.clientX - drag.clientX, event.clientY - drag.clientY) < 4) return;
  dragged = true;
  (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
  zoomTransform.value = { ...zoomTransform.value, x: zoomTransform.value.x + point.x - drag.point.x,
    y: zoomTransform.value.y + point.y - drag.point.y };
  drag.point = point;
}
function endPan(event: PointerEvent): void {
  if (drag?.id !== event.pointerId) return;
  const svg = event.currentTarget as SVGSVGElement;
  if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  drag = null;
}
function suppressDragClick(event: MouseEvent): void {
  if (dragged && event.detail !== 0) { event.stopPropagation(); event.preventDefault(); }
  dragged = false;
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
    path: path.value(feature) ?? "",
    marker:
      feature.geometry.type === "Point" || path.value.area(feature) < 10
        ? projection.value(feature.properties.label)
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
  <div class="world-map" :class="{ 'world-map-interactive': zoomable }">
    <div v-if="zoomable" class="map-zoom" aria-label="Zoom de la carte">
      <div class="map-zoom-group" role="group" aria-label="Niveau de zoom">
        <button type="button" :disabled="zoom === 1" aria-label="Dézoomer" @click="setZoom(zoom - .5)">−</button>
        <button type="button" :disabled="zoom === 24" aria-label="Zoomer" @click="setZoom(zoom + .5)">+</button>
      </div>
      <button type="button" class="map-reset" @click="returnWorld">← Retour au monde</button>
      <span>{{ Math.round(zoom * 100) }} %</span>
    </div>
    <div v-if="error" class="map-placeholder" role="alert">
      <p>Impossible de charger la carte.</p>
      <button class="text-button" @click="refresh()">Réessayer</button>
    </div>
    <div v-else-if="status !== 'success'" class="map-placeholder" role="status">
      La carte prend forme…
    </div>
    <div
      v-else
      ref="viewportElement"
      :class="{ 'map-scroll': scrollable && !zoomable }"
      :tabindex="scrollable ? 0 : undefined"
      :role="scrollable ? 'region' : undefined"
      :aria-label="
        scrollable
          ? 'Carte du monde, défilement horizontal possible'
          : undefined
      "
    >
      <svg
        :viewBox="`0 0 ${viewport.width} ${viewport.height}`"
        class="map-svg"
        role="group"
        aria-label="Carte interactive des pays"
        :aria-busy="loading"
        @mouseleave="clearPreview"
        @wheel="handleWheel"
        @pointerdown="startPan"
        @pointermove="pan"
        @pointerup="endPan"
        @pointercancel="endPan"
        @lostpointercapture="drag = null"
        @click.capture="suppressDragClick"
      >
        <g class="map-zoom-layer" :transform="renderedZoomTransform">
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
          <slot name="annotations" :anchors="anchors" :zoom="zoom" :camera="renderedZoomTransform" :select-country="selectIso3" />
        </g>
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
.world-map-interactive { position: relative; padding: 0 6px; }
.world-map-interactive .map-svg { width: 100%; height: auto; max-height: none; margin: 0; touch-action: none; cursor: grab; overflow: hidden; }
.world-map-interactive .map-svg:active { cursor: grabbing; }
.map-zoom .map-reset { width: auto; padding: 0 10px; font-size: 12px; }
.map-scroll { overflow: auto; }
.map-zoom { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 8px; font-size: 12px; }
.map-zoom-group { display: inline-flex; flex: 0 0 auto; gap: 0; }
.map-zoom button { width: 44px; height: 44px; border: 1px solid #27677c50; border-radius: 6px; background: #FFFEFA; color: #182C40; font-size: 20px; cursor: pointer; }
.map-zoom-group button:first-child { border-radius: 6px 0 0 6px; }
.map-zoom-group button:last-child { border-radius: 0 6px 6px 0; margin-left: -1px; }
.map-zoom button:hover:not(:disabled) { background: #F3F6F5; }
.map-zoom button:focus-visible { position: relative; z-index: 1; outline: 2px solid #27677C; outline-offset: 2px; }
.map-zoom button:disabled { opacity: .4; }
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
  stroke: #27677C;
  stroke-width: 2;
}
/* Keep borders in screen pixels while the geographic layer is transformed. */
.world-map-interactive .map-country,
.world-map-interactive .map-marker,
.world-map-interactive .map-grid {
  vector-effect: non-scaling-stroke;
  stroke-linejoin: round;
}
.world-map-interactive .map-country {
  stroke: rgb(var(--v-theme-map-border));
  stroke-width: 1;
}
.world-map-interactive .map-country:is(:hover, .active, :focus-visible),
.world-map-interactive .map-marker:is(:hover, .active, :focus-visible) {
  stroke: #27677C;
  stroke-width: 1.6;
}
.world-map-interactive .map-country.selected,
.world-map-interactive .map-marker.selected {
  stroke: #27677C;
  stroke-width: 2.4;
}
.world-map-interactive .customized:is(:hover, .active, :focus-visible, .selected) {
  fill: var(--country-fill, rgb(var(--v-theme-map-land)));
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
