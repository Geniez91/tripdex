<script setup lang="ts">
import type { Country } from "~/types/tripdex";

const props = defineProps<{ countries: Country[]; loading: boolean }>();
const selectedCountryId = ref<string | null>(null);
const selectedCountry = computed<Country | null>(() =>
  props.countries.find((country) => country.id === selectedCountryId.value) ?? null,
);
</script>

<template>
  <section class="supported-cities-browser" aria-labelledby="supported-cities-title">
    <div class="panel-heading">
      <span class="eyebrow">RÉFÉRENTIEL TRIPDEX</span>
      <h2 id="supported-cities-title">Villes prises en charge</h2>
      <p>Choisissez un pays pour parcourir les villes disponibles dans TripDex.</p>
    </div>
    <label class="field" for="supported-cities-country">
      <span>Pays</span>
      <select
        id="supported-cities-country"
        v-model="selectedCountryId"
        :disabled="loading || !countries.length"
      >
        <option :value="null">Choisir un pays</option>
        <option v-for="country in countries" :key="country.id" :value="country.id">
          {{ country.name }}
        </option>
      </select>
    </label>
    <CountrySupportedCities :country="selectedCountry" />
  </section>
</template>

<style scoped>
.supported-cities-browser {
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: var(--tripdex-radius-lg);
  background: rgb(var(--v-theme-surface));
  padding: 24px;
  margin-bottom: 18px;
}
.supported-cities-browser .panel-heading p {
  margin-top: 8px;
}
.supported-cities-browser .field {
  margin-top: 18px;
}
</style>
