<script setup lang="ts">
import { computed } from "vue";
import type { ChartOptions } from "chart.js";
import { Line } from "vue-chartjs";
import { useTheme } from "vuetify";
import type { PersonalProgression } from "~/types/interfaces/progression";
import "./chartRegistry";
import { countriesAxisMax } from "./timelineScale";

const props = defineProps<{
  points: PersonalProgression["timeline"]["countries"];
}>();
const theme = useTheme();
const formatter = new Intl.NumberFormat("fr-FR");
const chartData = computed(() => ({
  labels: props.points.map((point) => String(point.year)),
  datasets: [
    {
      label: "Pays explorés",
      data: props.points.map((point) => point.visitedCountries),
      borderColor: theme.current.value.colors.primary,
      backgroundColor: theme.current.value.colors.primary,
      pointBackgroundColor: theme.current.value.colors.primary,
      pointBorderColor: theme.current.value.colors.surface,
      pointRadius: 3,
      pointHoverRadius: 4,
      borderWidth: 2.5,
      tension: 0.25,
      fill: false,
    },
  ],
}));
const chartOptions = computed<ChartOptions<"line">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) =>
          `${formatter.format(context.parsed.y)} pays explorés`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: theme.current.value.colors.muted, maxRotation: 0 },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      min: 0,
      max: countriesAxisMax(
        Math.max(0, ...props.points.map((point) => point.visitedCountries)),
      ),
      ticks: { precision: 0, color: theme.current.value.colors.muted },
      grid: { color: theme.current.value.colors.ocean },
      border: { display: false },
    },
  },
}));
</script>

<template>
  <div class="timeline-chart" aria-hidden="true">
    <ClientOnly>
      <Line :data="chartData" :options="chartOptions" />
      <template #fallback><div class="chart-fallback" /></template>
    </ClientOnly>
  </div>
  <details class="year-values">
    <summary>Voir les valeurs année par année</summary>
    <ul>
      <li v-for="point in points" :key="point.year">
        {{ point.year }} — {{ formatter.format(point.visitedCountries) }}
        {{ point.visitedCountries === 1 ? "pays exploré" : "pays explorés" }}
      </li>
    </ul>
  </details>
</template>

<style scoped>
.timeline-chart {
  position: relative;
  height: 246px;
  min-width: 0;
}
.chart-fallback {
  height: 100%;
  border-radius: 12px;
  background: rgb(var(--v-theme-ocean));
}
.year-values {
  margin-top: 8px;
  color: rgb(var(--v-theme-muted));
  font-size: 12px;
}
.year-values summary {
  cursor: pointer;
  text-underline-offset: 3px;
}
.year-values ul {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 5px 16px;
  margin: 10px 0 0;
  padding-left: 18px;
}
</style>
