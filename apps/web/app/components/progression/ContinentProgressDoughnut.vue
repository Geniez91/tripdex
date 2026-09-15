<script setup lang="ts">
import { computed } from "vue";
import ProgressDonut from "./ProgressDonut.vue";
import { continentVisuals } from "./continentVisuals";
const props = defineProps<{
  continentCode: string;
  visitedCountries: number;
  totalCountries: number;
  percentage: number;
}>();
const visual = computed(() => continentVisuals[props.continentCode]);
const continentName = computed(() => visual.value?.name ?? props.continentCode);
</script>
<template>
  <div class="continent-item">
    <ProgressDonut
      :visited-countries="visitedCountries"
      :total-countries="totalCountries"
      :percentage="percentage"
      class="continent-donut"
      :size="160"
      :color="visual?.color"
      :track-color="visual?.track"
      :label="
        continentName +
        ' : ' +
        visitedCountries +
        ' sur ' +
        totalCountries +
        ' pays, ' +
        percentage.toLocaleString('fr-FR') +
        ' % explorés'
      "
    >
      <span class="continent-count">{{ visitedCountries }} / {{ totalCountries }}</span>
    </ProgressDonut>
    <div
      class="continent-identity"
      :style="{ '--continent-color': visual?.color }"
    >
      <img
        v-if="visual"
        :src="visual.asset"
        alt=""
        class="continent-silhouette"
      />
      <span>{{ continentName }}</span>
    </div>
  </div>
</template>
<style scoped>
.continent-item {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 20px;
  min-width: 0;
  padding: 16px 4px;
}
.continent-identity {
  display: grid;
  grid-template-rows: 80px 2.5em;
  justify-items: center;
  align-items: center;
  gap: 10px;
  width: 100%;
  color: rgb(var(--v-theme-ink));
  font:
    600 16px / 1.25 Georgia,
    serif;
  text-align: center;
}
.continent-identity span {
  text-transform: uppercase;
  text-decoration: underline;
  text-decoration-color: var(--continent-color);
  text-decoration-thickness: 3px;
  text-underline-offset: 5px;
}
.continent-silhouette {
  width: 100%;
  height: 80px;
  max-width: 180px;
  object-fit: contain;
}
.continent-count {
  margin-top: 5px;
  color: rgb(var(--v-theme-muted));
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.continent-donut {
  width: min(160px, 100%) !important;
  height: auto !important;
  aspect-ratio: 1;
}
.continent-donut :deep(.donut-center strong) {
  font-size: clamp(24px, 3vw, 32px);
}
</style>
