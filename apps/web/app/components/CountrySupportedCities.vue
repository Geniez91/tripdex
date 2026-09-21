<script setup lang="ts">
import type { Country } from "~/types/tripdex";

const props = withDefaults(
  defineProps<{
    country: Country | null;
    selectable?: boolean;
    modelValue?: string[];
  }>(),
  { selectable: false, modelValue: () => [] },
);
const emit = defineEmits<{ "update:modelValue": [cityIds: string[]] }>();
const config = useRuntimeConfig();
const countryId = computed<string | null>(() => props.country?.id ?? null);
const { cities, loading, failed, reload } = useCountryCities(
  countryId,
  config.public.apiBase,
);

function toggleCity(cityId: string, checked: boolean): void {
  const selected = new Set(props.modelValue);
  if (checked) selected.add(cityId);
  else selected.delete(cityId);
  emit("update:modelValue", [...selected]);
}
</script>

<template>
  <section class="supported-cities" :aria-busy="loading">
    <p v-if="!country" class="muted" role="status">
      Choisissez un pays pour voir les villes prises en charge.
    </p>
    <p v-else-if="loading" class="muted" role="status">
      Chargement des villes prises en charge pour {{ country.name }}…
    </p>
    <div v-else-if="failed" class="feedback error" role="alert">
      Impossible de charger les villes prises en charge.
      <button class="text-button" type="button" @click="reload()">Réessayer</button>
    </div>
    <p v-else-if="!cities.length" class="muted" role="status">
      Aucune ville prise en charge n’est actuellement disponible pour {{ country.name }}.
    </p>
    <div v-else class="country-options">
      <label v-for="city in cities" :key="city.id" class="country-option">
        <input
          v-if="selectable"
          :checked="modelValue.includes(city.id)"
          type="checkbox"
          :aria-label="city.name"
          @change="toggleCity(city.id, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ city.name }}</span>
      </label>
    </div>
  </section>
</template>
