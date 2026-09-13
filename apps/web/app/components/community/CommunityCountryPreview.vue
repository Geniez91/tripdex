<script setup lang="ts">
import type { Country } from '~/types/tripdex';
import type { CommunityCountryStatistics } from '~/types/interfaces/community';
import CountryFlag from '~/components/tripdex/CountryFlag.vue';

defineProps<{
  country: Pick<Country, 'iso2' | 'iso3' | 'name'>;
  statistics: CommunityCountryStatistics | null;
  year: number;
}>();
</script>

<template>
  <VCard class="country-preview" elevation="4" :aria-label="`Aperçu : ${country.name}`">
    <div class="preview-heading">
      <CountryFlag :iso2="country.iso2" :name="country.name" />
      <strong>{{ country.name }}</strong>
    </div>
    <div v-if="statistics" class="preview-stats">
      <span>{{ statistics.travelers.toLocaleString('fr-FR') }} voyageurs en {{ year }}</span>
      <span v-if="statistics.travelersNow > 0">
        {{ statistics.travelersNow.toLocaleString('fr-FR') }} actuellement sur place
      </span>
    </div>
    <p v-else class="preview-unavailable">Statistiques communautaires indisponibles</p>
  </VCard>
</template>

<style scoped>
.country-preview {
  width: min(236px, calc(100vw - 32px));
  padding: 12px 14px;
  border: 1px solid rgba(232, 186, 89, 0.7);
  border-radius: 12px;
  background: #182c40;
  color: #FFFEFA;
  pointer-events: none;
}
.preview-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fffefa;
  font: 600 16px/1.3 Georgia, serif;
}
.preview-stats {
  display: grid;
  gap: 4px;
  margin-top: 9px;
  color: #f4e7ca;
  font-size: 12px;
  line-height: 1.45;
}
.preview-unavailable {
  margin: 8px 0 0;
  color: #f4e7ca;
  font-size: 12px;
}
</style>
