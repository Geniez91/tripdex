<script setup lang="ts">
import type { Country } from "~/types/tripdex";
import type {
  CommunityCountryStatistics,
  CommunityStatistics,
} from "~/types/interfaces/community";
import type {
  CommunityFlow,
  CommunityMapMode,
} from "~/types/interfaces/community-map";
import type { MapCountryAppearance } from "~/types/interfaces/map";
import { getCommunityStatistics } from "~/services/api/community";
import {
  communityAppearances,
  isCommunityYear,
  selectedFlows,
} from "~/services/communityMap";
import CommunityMapControls from "~/components/community/CommunityMapControls.vue";
import CommunityCountryPanel from "~/components/community/CommunityCountryPanel.vue";
import CommunityFlowLayer from "~/components/community/CommunityFlowLayer.vue";
import CommunityMemoryMarker from "~/components/community/CommunityMemoryMarker.vue";
import { getCountryMemories } from "~/services/api/photo-contests";
import type { CountryMemory } from "~/types/interfaces/photo-contests";
const props = defineProps<{ countries: Country[]; revision: number }>();
const config = useRuntimeConfig();
const { data: memories } = await useAsyncData<CountryMemory[]>("community-memories",
  () => getCountryMemories(config.public.apiBase), { server: false, default: () => [] });
const activeMemory = ref<string | null>(null);
const year = ref<number>(new Date().getUTCFullYear());
const mode = ref<CommunityMapMode>("travelers");
const selectedIso3 = ref<string | null>(null);
const { data, status, error, refresh } =
  await useAsyncData<CommunityStatistics>(
    computed<string>(() => `community-countries-${year.value}`),
    () => getCommunityStatistics(config.public.apiBase, year.value),
    { server: false },
  );
const statistics = computed<CommunityCountryStatistics[]>(() =>
  status.value === "success" ? (data.value?.countries ?? []) : [],
);
const countriesByIso3 = computed<Map<string, CommunityCountryStatistics>>(
  () => new Map(statistics.value.map((item) => [item.country.iso3, item])),
);
const selectedCountry = computed<CommunityCountryStatistics | null>(() =>
  selectedIso3.value
    ? (countriesByIso3.value.get(selectedIso3.value) ?? null)
    : null,
);
const appearances = computed<Record<string, MapCountryAppearance>>(() =>
  communityAppearances(statistics.value, mode.value, year.value),
);
const flows = computed<CommunityFlow[]>(() =>
  mode.value === "flows" ? selectedFlows(selectedCountry.value) : [],
);
const hasTrending = computed<boolean>(() =>
  statistics.value.some((item) => item.trending),
);
const loading = computed<boolean>(
  () => status.value === "pending" || status.value === "idle",
);
const asOfDate = computed<string | null>(() =>
  status.value === "success" ? (data.value?.asOfDate ?? null) : null,
);
watch(
  () => props.revision,
  () => refresh(),
);
function changeYear(value: number): void {
  if (isCommunityYear(value)) year.value = value;
}
function changeMode(value: CommunityMapMode): void {
  mode.value = value;
}
function selectCountry(iso3: string | null): void {
  selectedIso3.value = iso3;
}
</script>
<template>
  <div class="community-explorer" :data-mode="mode">
    <CommunityMapControls
      :mode="mode"
      :year="year"
      @mode="changeMode"
      @year="changeYear"
    />
    <div class="community-context">
      <p v-if="mode === 'travelers'">
        Les voyages de la communauté en <strong>{{ year }}</strong
        >. Plus la teinte est soutenue, plus le pays accueille de voyageurs.
      </p>
      <p v-else-if="mode === 'trending'">
        Les destinations tendance de la communauté en <strong>{{ year }}</strong
        >.
      </p>
      <p v-else>
        Choisissez une destination pour voir d’où viennent ses voyageurs en
        <strong>{{ year }}</strong
        >.
      </p>
      <VAutocomplete
        :model-value="selectedIso3"
        :items="countries"
        item-title="name"
        item-value="iso3"
        label="Rechercher un pays"
        clearable
        hide-details
        density="compact"
        variant="outlined"
        @update:model-value="selectCountry"
      />
    </div>
    <div v-if="error" class="feedback error" role="alert">
      Les statistiques de la communauté sont indisponibles.
      <button class="text-button" @click="refresh()">Réessayer</button>
    </div>
    <p
      v-else-if="status === 'success' && mode === 'trending' && !hasTrending"
      class="community-empty"
      role="status"
    >
      Aucun pays tendance pour {{ year }}. La carte reste ouverte à la
      découverte.
    </p>
    <p
      v-else-if="
        status === 'success' &&
        mode === 'flows' &&
        selectedCountry &&
        !flows.length
      "
      class="community-empty"
      role="status"
    >
      Aucune origine disponible pour cette destination. Aucun flux à tracer.
    </p>
    <WorldMap
      :countries="countries"
      :visited-iso3="[]"
      :appearances="appearances"
      :selected-iso3="selectedIso3"
      :available="status === 'success'"
      :loading="loading"
      zoomable
      @select="selectCountry"
    >
      <template #annotations="{ anchors, zoom, camera }">
        <template v-for="memory in memories" :key="memory.winnerSubmissionId">
          <CommunityMemoryMarker v-if="anchors.has(memory.countryCode) && memory.winnerSubmissionId && memory.imageUrl"
            :memory="memory" :anchor="anchors.get(memory.countryCode)!" :zoom="zoom" :camera="camera" :active="activeMemory === memory.countryCode"
            @update:active="activeMemory = $event ? memory.countryCode : activeMemory === memory.countryCode ? null : activeMemory" />
        </template>
      </template>
      <template #routes="{ anchors, drawRoute }"
        ><CommunityFlowLayer
          v-if="mode === 'flows'"
          :flows="flows"
          :anchors="anchors"
          :draw-route="drawRoute"
      /></template>
      <template #legend>
        <div v-if="mode === 'travelers'" class="community-legend">
          <span class="intensity-key" aria-hidden="true" />Voyageurs : de peu à
          beaucoup
        </div>
        <div v-else-if="mode === 'trending'" class="community-legend">
          <span class="sun-key" aria-hidden="true" />Destinations tendance
        </div>
        <div v-else class="community-legend">
          <span aria-hidden="true">○ → ●</span> Résidence → destination
        </div>
      </template>
    </WorldMap>
    <p class="mobile-map-note">
      Faites glisser la carte ou utilisez la recherche pour choisir un
      pays.<span v-if="mode === 'flows'">
        Les trois premiers flux sont tracés ; toutes les origines disponibles
        figurent ci-dessous.</span
      >
    </p>
    <CommunityCountryPanel
      :country="selectedCountry"
      :year="year"
      :as-of-date="asOfDate"
      :loading="loading"
      :failed="!!error"
      :has-selection="selectedIso3 !== null"
    />
    <p class="community-note">
      Un voyageur compte une fois par pays et par année, voyages prévus inclus.
      Les origines correspondent aux pays de résidence renseignés. La présence
      actuelle repose sur les dates de séjour, avec une date de fin.
    </p>
  </div>
</template>
<style scoped>
.community-context {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 28px 14px;
}
.community-context p {
  flex: 1;
  font-size: 13px;
  line-height: 1.6;
  color: rgb(var(--v-theme-muted));
}
.community-context :deep(.v-input) {
  max-width: 260px;
  min-width: 180px;
}
.community-empty {
  margin: 0 28px 10px;
  padding: 12px 16px;
  background: rgba(var(--v-theme-sun), 0.14);
  border-left: 3px solid rgb(var(--v-theme-sun));
  border-radius: 4px 10px 10px 4px;
  font-size: 14px;
}
.community-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  flex-shrink: 0;
}
.intensity-key {
  width: 65px;
  height: 10px;
  background: linear-gradient(
    to right,
    rgb(var(--v-theme-map-land)),
    rgb(var(--v-theme-primary))
  );
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 3px;
}
.sun-key {
  width: 12px;
  height: 12px;
  background: rgb(var(--v-theme-sun));
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 50%;
}
.community-note {
  font-size: 12px;
  line-height: 1.6;
  color: rgb(var(--v-theme-muted));
  padding: 0 28px 20px;
}
.mobile-map-note {
  display: none;
}
@media (max-width: 600px) {
  .community-context {
    padding: 0 16px 12px;
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }
  .community-context :deep(.v-input) {
    max-width: none;
  }
  .community-empty {
    margin-inline: 16px;
  }
  .community-note {
    padding-inline: 16px;
  }
  .mobile-map-note {
    display: block;
    font-size: 11px;
    line-height: 1.6;
    color: rgb(var(--v-theme-muted));
    padding: 0 16px 16px;
  }
}
</style>
