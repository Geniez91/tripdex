<script setup lang="ts">
import type { CommunityMapMode } from "~/types/interfaces/community-map";
import { isCommunityYear } from "~/services/communityMap";
const props = defineProps<{ mode: CommunityMapMode; year: number }>();
const emit = defineEmits<{
  mode: [value: CommunityMapMode];
  year: [value: number];
}>();
const draftYear = ref<number | string>(props.year);
const validYear = computed<boolean>(() =>
  isCommunityYear(Number(draftYear.value)),
);
const modes: { value: CommunityMapMode; label: string; icon: string }[] = [
  { value: "travelers", label: "Voyageurs", icon: "mdi-account-group-outline" },
  { value: "trending", label: "Tendances", icon: "mdi-white-balance-sunny" },
  { value: "flows", label: "Flux", icon: "mdi-airplane" },
];
watch(
  () => props.year,
  (year) => {
    draftYear.value = year;
  },
);
function submitYear(): void {
  if (validYear.value) emit("year", Number(draftYear.value));
}
</script>
<template>
  <div class="community-controls">
    <div class="community-modes" role="group" aria-label="Mode de carte">
      <button
        v-for="item in modes"
        :key="item.value"
        type="button"
        :aria-pressed="mode === item.value"
        @click="emit('mode', item.value)"
      >
        <VIcon :icon="item.icon" size="18" aria-hidden="true" />{{ item.label }}
      </button>
    </div>
    <form class="community-year" @submit.prevent="submitYear">
      <label for="community-year">Année</label>
      <button
        type="button"
        aria-label="Année précédente"
        :disabled="year <= 1"
        @click="emit('year', year - 1)"
      >
        ‹
      </button>
      <input
        id="community-year"
        v-model="draftYear"
        type="number"
        min="1"
        max="9998"
        step="1"
        required
      />
      <button
        type="button"
        aria-label="Année suivante"
        :disabled="year >= 9998"
        @click="emit('year', year + 1)"
      >
        ›
      </button>
      <button type="submit" class="apply-year" :disabled="!validYear">
        Afficher
      </button>
    </form>
  </div>
</template>
<style scoped>
.community-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 22px 28px 16px;
}
.community-modes {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgb(var(--v-theme-ocean));
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 14px;
}
.community-modes button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 650;
  color: rgb(var(--v-theme-primary));
}
.community-modes button[aria-pressed="true"] {
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 2px 6px rgba(var(--v-theme-ink), 0.1);
  color: rgb(var(--v-theme-ink));
  text-decoration: underline;
  text-decoration-color: rgb(var(--v-theme-sun));
  text-decoration-thickness: 3px;
  text-underline-offset: 6px;
}
.community-year {
  display: flex;
  align-items: center;
  gap: 8px;
}
.community-year label {
  font-size: 12px;
  color: rgb(var(--v-theme-muted));
}
.community-year button {
  min-width: 32px;
  min-height: 38px;
  border-radius: 8px;
  font-size: 24px;
  color: rgb(var(--v-theme-primary));
}
.community-year input {
  width: 82px;
  padding: 8px;
  text-align: center;
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 8px;
  font-weight: 650;
  color: rgb(var(--v-theme-ink));
}
.community-year .apply-year {
  font-size: 12px;
  padding: 0 8px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
button:disabled {
  opacity: 0.4;
  cursor: default;
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .community-controls {
    padding: 18px 16px 12px;
    gap: 14px;
  }
  .community-modes {
    width: 100%;
  }
  .community-modes button {
    flex: 1;
    padding-inline: 7px;
    font-size: 12px;
  }
  .community-year {
    width: 100%;
    justify-content: center;
  }
}
</style>
