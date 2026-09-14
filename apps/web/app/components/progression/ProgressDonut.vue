<script setup lang="ts">
import { computed } from "vue";
import type { ChartOptions } from "chart.js";
import { Doughnut } from "vue-chartjs";
import { useTheme } from "vuetify";
import "./chartRegistry";

const props = withDefaults(
  defineProps<{
    visitedCountries: number;
    totalCountries: number;
    percentage: number;
    size?: number;
    color?: string;
    trackColor?: string;
    label: string;
  }>(),
  { size: 196 },
);
const theme = useTheme();
const chartData = computed(() => ({
  labels: ["Explorés", "À explorer"],
  datasets: [
    {
      data: [
        props.visitedCountries,
        Math.max(props.totalCountries - props.visitedCountries, 0),
      ],
      backgroundColor: [
        props.color ?? theme.current.value.colors.primary,
        props.trackColor ?? theme.current.value.colors.ocean,
      ],
      borderWidth: 0,
      hoverOffset: 0,
      spacing: 2,
    },
  ],
}));
const chartOptions = computed<ChartOptions<"doughnut">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: "78%",
  animation: { duration: 0 },
  events: [],
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
}));
const formattedPercentage = computed(() =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(props.percentage),
);
</script>

<template>
  <div
    class="progress-donut"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    :aria-label="label"
  >
    <div class="donut-canvas" aria-hidden="true">
      <ClientOnly>
        <Doughnut :data="chartData" :options="chartOptions" />
        <template #fallback
          ><div class="donut-fallback" :style="{ borderColor: trackColor }"
        /></template>
      </ClientOnly>
    </div>
    <div class="donut-center" aria-hidden="true">
      <strong>{{ formattedPercentage }} %</strong>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.progress-donut {
  position: relative;
  flex: 0 0 auto;
  max-width: 100%;
  margin-inline: auto;
}
.donut-canvas,
.donut-fallback {
  position: absolute;
  inset: 0;
}
.donut-fallback {
  border: 13px solid rgb(var(--v-theme-ocean));
  border-radius: 50%;
}
.donut-center {
  position: absolute;
  inset: 20%;
  display: grid;
  place-content: center;
  text-align: center;
  pointer-events: none;
}
.donut-center strong {
  color: rgb(var(--v-theme-ink));
  font:
    500 clamp(22px, 3vw, 34px) / 1 Georgia,
    serif;
  letter-spacing: -0.6px;
}
</style>
