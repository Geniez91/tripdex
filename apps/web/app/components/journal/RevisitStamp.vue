<script setup lang="ts">
import { civilYear } from "~/utils/dates";
const props = defineProps<{
  destination: string;
  country?: string;
  date: string;
  seed?: string;
}>();
const rotation = computed<string>(() => {
  const seed = props.seed ?? props.destination;
  let hash = 0;
  for (const character of seed)
    hash = (hash * 17 + character.charCodeAt(0)) | 0;
  return `${(Math.abs(hash) % 5) - 2}deg`;
});
const year = computed<number | null>(() => civilYear(props.date));
</script>

<template>
  <span
    class="revisit-stamp"
    :style="{ '--stamp-rotation': rotation }"
    aria-label="Voyage revisité"
  >
    <span class="revisit-ring">
      <strong>REVISIT</strong>
      <span>{{ destination }}</span>
      <span v-if="country">{{ country }}</span>
      <span>{{ year }}</span>
    </span>
  </span>
</template>

<style scoped>
.revisit-stamp {
  --stamp-rotation: 1deg;
  display: inline-flex;
  transform: rotate(var(--stamp-rotation));
  color: rgb(var(--v-theme-secondary));
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.revisit-ring {
  display: grid;
  place-items: center;
  gap: 2px;
  min-width: 112px;
  min-height: 82px;
  padding: 9px 12px;
  border: 1px dashed currentColor;
  border-radius: 42%;
  outline: 1px solid currentColor;
  outline-offset: -5px;
  font-size: 8px;
  letter-spacing: 1px;
  text-align: center;
}
.revisit-ring strong {
  font-size: 11px;
  letter-spacing: 1.5px;
}
@media (prefers-reduced-motion: reduce) {
  .revisit-stamp {
    transform: none;
  }
}
</style>
