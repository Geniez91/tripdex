<script setup lang="ts">
import { computed } from "vue";
import type { ChartOptions } from "chart.js";
import { Bar } from "vue-chartjs";
import { useTheme } from "vuetify";
import type { PersonalProgression } from "~/types/interfaces/progression";
import "./chartRegistry";

const props = defineProps<{
  points: PersonalProgression["timeline"]["travelDays"];
}>();
const theme = useTheme();
const formatter = new Intl.NumberFormat("fr-FR");
const chartData = computed(() => ({
  labels: props.points.map((point) => String(point.year)),
  datasets: [
    {
      label: "Jours de voyage",
      data: props.points.map((point) => point.travelDays),
      backgroundColor: theme.current.value.colors.primary,
      hoverBackgroundColor: theme.current.value.colors.secondary,
      borderRadius: 5,
      maxBarThickness: 34,
    },
  ],
}));
const chartOptions = computed<ChartOptions<"bar">>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => `${formatter.format(context.parsed.y)} jours`,
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
      <Bar :data="chartData" :options="chartOptions" />
      <template #fallback><div class="chart-fallback" /></template>
    </ClientOnly>
  </div>
  <details class="year-values">
    <summary>Voir les valeurs année par année</summary>
    <ul>
      <li v-for="point in points" :key="point.year">
        {{ point.year }} — {{ formatter.format(point.travelDays) }} jours
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
