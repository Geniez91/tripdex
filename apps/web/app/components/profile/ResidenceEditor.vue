<script setup lang="ts">
import type { Country } from "~/types/tripdex";
import { updateResidence } from "~/services/api/profile";
import { getCountries } from "~/services/api/countries";

const config = useRuntimeConfig();
const api = useTripdexApi();
const {
  data: countries,
  error: countriesError,
  refresh: refreshCountries,
} = await useAsyncData<Country[]>(
  "public-residence-countries",
  (_nuxtApp, { signal }) => getCountries(config.public.apiBase, signal),
  { server: false, default: () => [] },
);
const { data, status, error, refresh } = await useResidence();
const selected = ref<string | null>(null);
const saving = ref(false);
const message = ref("");
const saveFailed = ref(false);
watch(
  data,
  (value) => {
    selected.value = value?.residenceCountry?.id ?? null;
  },
  { immediate: true },
);
const dirty = computed(
  () => selected.value !== (data.value?.residenceCountry?.id ?? null),
);
async function save() {
  if (saving.value) return;
  saving.value = true;
  message.value = "";
  saveFailed.value = false;
  try {
    data.value = await updateResidence(api, selected.value || null);
    message.value = "Pays de résidence enregistré.";
    clearNuxtData((key) => key.startsWith("community-countries-"));
  } catch {
    saveFailed.value = true;
    message.value =
      "Impossible d’enregistrer votre pays de résidence. Réessayez.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="residence-editor" aria-labelledby="residence-title">
    <div>
      <span class="eyebrow">VOTRE POINT DE DÉPART</span>
      <h2 id="residence-title">Pays de résidence</h2>
      <p>
        Facultatif. Il contribue aux statistiques des pays de résidence des
        voyageurs de la communauté.
      </p>
    </div>
    <div v-if="error || countriesError" class="feedback error" role="alert">
      Impossible de charger votre pays de résidence.
      <button
        class="text-button"
        @click="
          refresh();
          refreshCountries();
        "
      >
        Réessayer
      </button>
    </div>
    <form v-else @submit.prevent="save">
      <VAutocomplete
        v-model="selected"
        :items="countries"
        item-title="name"
        item-value="id"
        label="Pays de résidence"
        clearable
        clear-icon="mdi-close"
        :disabled="saving || status !== 'success'"
        :loading="status === 'pending'"
        hide-details
      />
      <VBtn
        type="submit"
        color="primary"
        :loading="saving"
        :disabled="!dirty || status !== 'success'"
        >Enregistrer</VBtn
      >
    </form>
    <p
      v-if="message"
      :class="['feedback', saveFailed ? 'error' : 'success']"
      :role="saveFailed ? 'alert' : 'status'"
    >
      {{ message }}
    </p>
  </section>
</template>

<style scoped>
.residence-editor {
  margin-top: 32px;
  padding: 24px;
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: var(--tripdex-radius-lg);
  background: rgb(var(--v-theme-surface));
}
h2 {
  margin: 8px 0;
}
p {
  color: rgb(var(--v-theme-muted));
  line-height: 1.6;
}
form {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
}
form > :first-child {
  min-width: 0;
}
@media (max-width: 600px) {
  form {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
