<script setup lang="ts">
import countries from "svg-country-flags/countries.json";

const props = defineProps<{ iso2?: string | null; name?: string }>();
const failed = ref(false);
const code = computed<string | null>(() => {
  const value = props.iso2?.toUpperCase();
  return value && /^[A-Z]{2}$/.test(value) && Object.hasOwn(countries, value)
    ? value.toLowerCase()
    : null;
});
const config = useRuntimeConfig();
const source = computed<string | null>(() =>
  code.value ? `${config.app.baseURL}country-flags/${code.value}.svg` : null,
);
watch(source, () => {
  failed.value = false;
});
</script>

<template>
  <img
    v-if="source && !failed"
    class="country-flag"
    :src="source"
    :alt="`Drapeau : ${name || iso2?.toUpperCase()}`"
    decoding="async"
    @error="failed = true"
  />
  <VIcon
    v-else
    icon="mdi-earth"
    size="20"
    role="img"
    :aria-label="name || 'Pays non renseigné'"
  />
</template>

<style scoped>
.country-flag {
  display: inline-block;
  width: auto;
  height: 20px;
  max-width: 40px;
  object-fit: contain;
  vertical-align: middle;
  border: 1px solid rgba(var(--v-theme-ink), 0.16);
  border-radius: 2px;
  flex-shrink: 0;
}
</style>
