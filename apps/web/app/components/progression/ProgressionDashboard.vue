<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import type { Country } from "~/types/tripdex";
import type { PersonalProgression } from "~/types/interfaces/progression";
import PersonalMap from "~/components/profile/PersonalMap.vue";
import WorldProgressDoughnut from "./WorldProgressDoughnut.vue";
import ContinentProgressDoughnut from "./ContinentProgressDoughnut.vue";
import CountriesTimelineChart from "./CountriesTimelineChart.vue";
import TravelDaysChart from "./TravelDaysChart.vue";
import AchievementGallery from "./AchievementGallery.vue";

const props = defineProps<{
  countries: Country[];
  visitedIso3: string[];
  mapLoading: boolean;
  mapAvailable: boolean;
  mapError: string | null;
}>();
const emit = defineEmits<{ retryMap: [] }>();
const progression = useProgression();
const progressionData = progression.data;
const continentOrder = ["AF", "AS", "EU", "NA", "SA", "OC", "AN"];
const orderedContinents = computed(() =>
  [...(progressionData.value?.continents ?? [])].sort(
    (left, right) =>
      continentOrder.indexOf(left.continentCode) -
      continentOrder.indexOf(right.continentCode),
  ),
);
const progressionLoading = progression.loading;
const progressionError = progression.error;
const number = new Intl.NumberFormat("fr-FR");

onMounted(() => {
  void progression.load();
});
watch(
  () => progression.invalidated.value,
  (invalidated) => {
    if (invalidated) void progression.load();
  },
);

function metricRows(data: PersonalProgression) {
  return [
    {
      label: "Pays explorés",
      value: data.summary.visitedCountries,
      icon: "mdi-earth",
      accent: "map",
      context: `sur ${number.format(data.summary.totalCountries)} dans le monde`,
    },
    {
      label: "Continents explorés",
      value: data.summary.exploredContinents,
      icon: "mdi-compass-outline",
      accent: "compass",
      context: `sur ${data.continents.length}`,
    },
    {
      label: "Pays revisités",
      value: data.summary.revisitedCountries,
      icon: "mdi-map-marker-path",
      accent: "return",
      context:
        data.summary.revisitedCountries === 0
          ? "aucun pour l’instant"
          : "visités lors de plusieurs trips",
    },
    {
      label: "Jours en voyage",
      value: data.summary.totalTravelDays,
      icon: "mdi-calendar-range-outline",
      accent: "days",
      context: "sur l’ensemble de tes trips",
    },
  ];
}
</script>

<template>
  <section class="progression-dashboard" aria-label="Ma progression de voyage">
    <VRow v-if="progressionData" class="metric-row" dense>
      <VCol
        v-for="metric in metricRows(progressionData)"
        :key="metric.label"
        cols="6"
        md="3"
      >
        <VCard class="metric-card" :class="`metric-${metric.accent}`">
          <VCardText>
            <span class="metric-icon" aria-hidden="true">
              <VIcon :icon="metric.icon" size="28" />
            </span>
            <strong>{{ number.format(metric.value) }}</strong>
            <span class="metric-label">{{ metric.label }}</span>
            <span class="metric-context">{{ metric.context }}</span>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
    <VRow v-else-if="progressionLoading" class="metric-row" dense>
      <VCol v-for="slot in 4" :key="slot" cols="6" md="3">
        <VSkeletonLoader type="card" class="metric-skeleton" />
      </VCol>
    </VRow>

    <VAlert
      v-if="progressionError && progressionData"
      class="progression-error stale-error"
      type="warning"
      variant="tonal"
      role="status"
    >
      La dernière actualisation a échoué. Les données chargées restent
      affichées.
      <VBtn class="retry-button" variant="text" @click="progression.retry()">
        Réessayer
      </VBtn>
    </VAlert>

    <VRow class="map-progress-row" align="stretch">
      <VCol cols="12" lg="8">
        <VCard class="map-card" aria-labelledby="personal-map-title">
          <VCardText>
            <div class="section-heading map-heading">
              <div>
                <span class="eyebrow">TON ATLAS PERSONNEL</span>
                <h2 id="personal-map-title">Les traces de tes voyages</h2>
              </div>
              <span class="map-heading-count" v-if="progressionData">
                {{ number.format(progressionData.summary.visitedCountries) }}
                pays
              </span>
            </div>
            <VAlert
              v-if="mapError"
              class="map-error"
              type="error"
              variant="tonal"
              role="alert"
            >
              Impossible de charger les pays visités.
              <VBtn variant="text" @click="emit('retryMap')">Réessayer</VBtn>
            </VAlert>
            <PersonalMap
              :countries="countries"
              :visited-iso3="visitedIso3"
              :loading="mapLoading"
              :available="mapAvailable"
            />
          </VCardText>
        </VCard>
      </VCol>
      <VCol cols="12" lg="4">
        <WorldProgressDoughnut
          v-if="progressionData"
          :visited-countries="progressionData.summary.visitedCountries"
          :total-countries="progressionData.summary.totalCountries"
          :percentage="progressionData.summary.worldCompletionPercentage"
        />
        <VCard v-else-if="progressionLoading" class="loading-card">
          <VSkeletonLoader type="heading, image, paragraph" />
        </VCard>
        <VCard v-else-if="progressionError" class="progression-error-card">
          <VCardText>
            <VIcon icon="mdi-cloud-alert-outline" color="error" size="28" />
            <h2>Ta progression n’est pas disponible</h2>
            <p>{{ progressionError }}</p>
            <VBtn
              color="primary"
              prepend-icon="mdi-refresh"
              @click="progression.retry()"
            >
              Réessayer
            </VBtn>
          </VCardText>
        </VCard>
        <VCard v-else class="loading-card">
          <VCardText
            >Connecte-toi pour consulter ta progression personnelle.</VCardText
          >
        </VCard>
      </VCol>
    </VRow>

    <VAlert
      v-if="progressionData && progressionData.summary.visitedCountries === 0"
      class="empty-state"
      color="ocean"
      variant="tonal"
      border="start"
      role="status"
    >
      <div class="empty-copy">
        <span class="eyebrow">LE PREMIER TRAIT DE TON ATLAS</span>
        <h2>Ton atlas est encore vierge.</h2>
        <p>Logge un voyage pour commencer à compléter le monde.</p>
      </div>
      <VBtn href="#trip-form-title" color="primary" prepend-icon="mdi-plus">
        Logger un voyage
      </VBtn>
    </VAlert>

    <template
      v-if="progressionData && progressionData.summary.visitedCountries > 0"
    >
      <section class="continent-section" aria-labelledby="continent-heading">
        <header class="section-heading">
          <div>
            <span class="eyebrow">EXPLORATION PAR CONTINENT</span>
            <h2 id="continent-heading">
              Chaque continent raconte une histoire
            </h2>
          </div>
        </header>
        <div class="continent-grid">
          <div
            v-for="continent in orderedContinents"
            :key="continent.continentCode"
          >
            <ContinentProgressDoughnut
              :continent-code="continent.continentCode"
              :visited-countries="continent.visitedCountries"
              :total-countries="continent.totalCountries"
              :percentage="continent.completionPercentage"
            />
          </div>
        </div>
      </section>

    </template>

    <AchievementGallery />

    <template
      v-if="progressionData && progressionData.summary.visitedCountries > 0"
    >

      <section class="timeline-section" aria-labelledby="timeline-heading">
        <header class="section-heading">
          <div>
            <span class="eyebrow">TON PARCOURS</span>
            <h2 id="timeline-heading">Ton monde s’agrandit</h2>
          </div>
        </header>
        <VRow align="stretch">
          <VCol cols="12" lg="6">
            <VCard
              class="timeline-card"
              aria-labelledby="countries-chart-title"
            >
              <VCardText>
                <h3 id="countries-chart-title">Pays explorés dans le temps</h3>
                <p class="chart-question">
                  Comment ton monde s’est-il agrandi ?
                </p>
                <CountriesTimelineChart
                  v-if="progressionData.timeline.countries.length"
                  :points="progressionData.timeline.countries"
                />
                <p v-else class="chart-empty">
                  Aucune période de voyage à afficher.
                </p>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" lg="6">
            <VCard class="timeline-card" aria-labelledby="travel-chart-title">
              <VCardText>
                <span class="eyebrow">JOURS DE VOYAGE</span>
                <h3 id="travel-chart-title">Jours de voyage par année</h3>
                <p class="chart-question">
                  Combien de jours as-tu voyagé chaque année ?
                </p>
                <TravelDaysChart
                  v-if="progressionData.timeline.travelDays.length"
                  :points="progressionData.timeline.travelDays"
                />
                <p v-else class="chart-empty">
                  Aucune période de voyage à afficher.
                </p>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </section>
    </template>
  </section>
</template>

<style scoped>
.progression-dashboard {
  display: grid;
  gap: 28px;
  min-width: 0;
}
.metric-row {
  margin: 0;
}
.metric-card {
  position: relative;
  height: 100%;
  overflow: hidden;
  border-color: rgba(var(--v-theme-ink), 0.08);
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 22px rgba(var(--v-theme-ink), 0.045);
}
.metric-card :deep(.v-card-text) {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  align-items: center;
  gap: 3px 12px;
  padding: 18px 16px 18px 20px;
}
.metric-icon {
  grid-row: span 3;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 15px;
  background: rgb(var(--v-theme-ocean));
  color: rgb(var(--v-theme-primary));
}
.metric-return .metric-icon {
  background: #f4e4bf;
  color: #876020;
}
.metric-compass .metric-icon {
  background: #e0ebdd;
  color: #48684f;
}
.metric-days .metric-icon {
  background: #eae2f2;
  color: #735d8d;
}
.metric-map .metric-icon {
  background: #dcebf3;
}
.metric-context {
  color: rgb(var(--v-theme-muted));
  font-size: 11px;
  line-height: 1.4;
}
.metric-card strong {
  color: rgb(var(--v-theme-ink));
  font:
    500 clamp(26px, 3vw, 34px) / 1 Georgia,
    serif;
  font-variant-numeric: tabular-nums;
}
.metric-label {
  color: rgb(var(--v-theme-muted));
  font-size: 12px;
  line-height: 1.35;
}
.metric-skeleton,
.loading-card {
  height: 110px;
  background: rgb(var(--v-theme-surface));
}
.map-progress-row {
  margin: -12px;
}
.map-card {
  height: 100%;
  border-color: rgba(var(--v-theme-ink), 0.09);
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 12px 30px rgba(var(--v-theme-ink), 0.055);
}
.map-card :deep(.v-card-text) {
  padding: 22px 22px 12px;
}
.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.section-heading h2,
.map-heading h2 {
  margin: 7px 0 0;
  color: rgb(var(--v-theme-ink));
  font:
    500 clamp(21px, 2.4vw, 28px) / 1.2 Georgia,
    serif;
  letter-spacing: -0.45px;
}
.map-heading-count {
  color: rgb(var(--v-theme-muted));
  font-size: 12px;
  white-space: nowrap;
}
.map-error {
  margin-bottom: 12px;
}
.world-progress-card,
.continent-card,
.timeline-card {
  border-radius: var(--tripdex-radius-lg);
}
.continent-section,
.timeline-section {
  min-width: 0;
}
.continent-section .section-heading,
.timeline-section .section-heading {
  margin-bottom: 16px;
}
.continent-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px 16px;
}
.continent-section {
  container-type: inline-size;
  padding: 24px 20px;
  border-block: 1px solid rgba(var(--v-theme-ink), 0.08);
  background: rgb(var(--v-theme-surface));
  border-radius: var(--tripdex-radius-lg);
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}
.eyebrow::before {
  content: "";
  width: 20px;
  height: 2px;
  background: rgb(var(--v-theme-sun));
  flex-shrink: 0;
}
@container (min-width: 352px) {
  .continent-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .continent-grid > div {
    grid-column: span 2;
    min-width: 0;
  }
  .continent-grid > div:last-child {
    grid-column: 2 / span 2;
  }
}
@container (min-width: 560px) {
  .continent-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
  .continent-grid > div:nth-child(4),
  .continent-grid > div:nth-child(6) {
    grid-column: 2 / span 2;
  }
  .continent-grid > div:last-child {
    grid-column: span 2;
  }
}
@container (min-width: 760px) {
  .continent-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
  .continent-grid > div:nth-child(4),
  .continent-grid > div:nth-child(6) {
    grid-column: span 2;
  }
  .continent-grid > div:nth-child(5) {
    grid-column: 2 / span 2;
  }
}
.timeline-card {
  height: 100%;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 24px rgba(var(--v-theme-ink), 0.045);
}
.timeline-card :deep(.v-card-text) {
  padding: 22px 20px 18px;
}
.timeline-card h3 {
  color: rgb(var(--v-theme-ink));
  font:
    500 18px / 1.3 Georgia,
    serif;
}
.chart-question {
  margin: 5px 0 14px;
  color: rgb(var(--v-theme-muted));
  font-size: 12px;
}
.chart-empty {
  padding: 48px 0;
  color: rgb(var(--v-theme-muted));
  font-size: 13px;
}
.progression-error {
  margin-bottom: -8px;
}
.retry-button {
  margin-left: 6px;
}
.progression-error-card {
  height: 100%;
  background: rgb(var(--v-theme-surface));
}
.progression-error-card :deep(.v-card-text) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 320px;
  text-align: center;
}
.progression-error-card h2 {
  color: rgb(var(--v-theme-ink));
  font:
    500 21px / 1.25 Georgia,
    serif;
}
.progression-error-card p {
  max-width: 280px;
  color: rgb(var(--v-theme-muted));
  font-size: 13px;
}
.empty-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 18px;
  border-color: rgba(var(--v-theme-primary), 0.22);
  background: rgb(var(--v-theme-ocean));
  color: rgb(var(--v-theme-ink));
}
.empty-copy h2 {
  margin: 5px 0;
  font:
    500 21px / 1.25 Georgia,
    serif;
}
.empty-copy p {
  color: rgb(var(--v-theme-muted));
  font-size: 13px;
}
@media (max-width: 600px) {
  .progression-dashboard {
    gap: 22px;
  }
  .metric-card :deep(.v-card-text) {
    grid-template-columns: minmax(0, 1fr);
    gap: 2px 9px;
    padding: 14px 10px 14px 14px;
  }
  .metric-icon {
    grid-row: auto;
    width: 44px;
    height: 44px;
  }
  .metric-card strong {
    font-size: 25px;
  }
  .metric-label {
    font-size: 11px;
  }
  .map-card :deep(.v-card-text) {
    padding: 18px 12px 8px;
  }
  .map-heading {
    align-items: start;
  }
  .map-heading h2 {
    font-size: 22px;
  }
  .map-heading-count {
    padding-top: 18px;
  }
  .empty-state {
    align-items: start;
    flex-direction: column;
    gap: 14px;
  }
}
</style>
