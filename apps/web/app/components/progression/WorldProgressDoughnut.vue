<script setup lang="ts">
import ProgressDonut from "./ProgressDonut.vue";

const props = defineProps<{
  visitedCountries: number;
  totalCountries: number;
  percentage: number;
}>();
const number = new Intl.NumberFormat("fr-FR");
</script>

<template>
  <VCard class="world-progress-card" aria-labelledby="world-progress-title">
    <VCardText>
      <span class="eyebrow">COMPLÉTION MONDIALE</span>
      <h2 id="world-progress-title">Le monde, à ton rythme</h2>
      <ProgressDonut
        class="world-donut"
        :visited-countries="visitedCountries"
        :total-countries="totalCountries"
        :percentage="percentage"
        :size="232"
        :label="`${number.format(visitedCountries)} sur ${number.format(totalCountries)} pays explorés, ${percentage.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`"
      >
        <p class="world-count">
          {{ number.format(visitedCountries) }} /
          {{ number.format(totalCountries) }}
        </p>
        <span class="world-label">pays explorés</span>
      </ProgressDonut>
      <p class="world-encouragement">Chaque voyage agrandit ton monde.</p>
    </VCardText>
  </VCard>
</template>

<style scoped>
.world-progress-card {
  height: 100%;
  border-color: rgba(var(--v-theme-secondary), 0.22);
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 12px 30px rgba(var(--v-theme-ink), 0.055);
}
.world-progress-card :deep(.v-card-text) {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 26px 20px 28px;
}
.world-progress-card h2 {
  margin: 0 0 4px;
  color: rgb(var(--v-theme-ink));
  font:
    500 22px / 1.2 Georgia,
    serif;
  text-align: center;
}
.world-donut {
  margin-block: 8px;
}
.world-count {
  color: rgb(var(--v-theme-muted));
  font-size: 18px;
  margin-top: 12px;
  text-align: center;
}
.world-count strong {
  color: rgb(var(--v-theme-ink));
  font-size: 18px;
  font-weight: 700;
}
.world-label {
  margin-top: 5px;
  font-size: 12px;
  color: rgb(var(--v-theme-muted));
}
.world-encouragement {
  margin: 0;
  color: rgb(var(--v-theme-muted));
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
  text-wrap: balance;
}
</style>
