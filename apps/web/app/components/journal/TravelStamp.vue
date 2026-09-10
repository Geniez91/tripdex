<script setup lang="ts">
import CountryFlag from "~/components/tripdex/CountryFlag.vue";
const props = defineProps<{
  destination: string;
  country?: string;
  date?: string;
  collectible?: boolean;
  seed?: string;
}>();

const rotation = computed<string>(() => {
  const seed = props.seed ?? props.destination;
  let hash = 0;
  for (const character of seed)
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return `${(Math.abs(hash) % 3) - 1}deg`;
});
const year = computed<number | null>(() => {
  const value = props.date ? new Date(props.date).getUTCFullYear() : NaN;
  return Number.isFinite(value) ? value : null;
});
</script>

<template>
  <span
    class="travel-stamp"
    :class="{ 'is-collectible': collectible }"
    :style="{ '--stamp-rotation': rotation }"
    :aria-label="`Tampon de voyage : ${destination}${year ? `, ${year}` : ''}`"
  >
    <span class="stamp-ring">
      <span class="stamp-signature">TRIPDEX</span>
      <VIcon icon="mdi-compass-outline" size="18" aria-hidden="true" />
      <strong>{{ destination }}</strong>
      <CountryFlag
        v-if="country && collectible"
        :iso2="country"
        :name="destination"
      />
      <span v-if="year" class="stamp-year">{{ year }}</span>
      <span class="stamp-signature">EXPLORÉ</span>
    </span>
  </span>
</template>

<style scoped>
.travel-stamp {
  --stamp-rotation: -2deg;
  display: inline-flex;
  transform: rotate(var(--stamp-rotation));
  color: rgb(var(--v-theme-primary));
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.stamp-ring {
  display: grid;
  place-items: center;
  gap: 2px;
  width: 112px;
  min-height: 112px;
  padding: 10px;
  border: 1px solid currentColor;
  border-radius: 50%;
  outline: 1px solid currentColor;
  outline-offset: -5px;
  opacity: 0.82;
  text-align: center;
}
.stamp-ring strong {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 12px;
  letter-spacing: 1.2px;
}
.stamp-signature,
.stamp-year {
  font-size: 9px;
  letter-spacing: 1px;
}
.stamp-year {
  font-weight: 700;
}
@media (prefers-reduced-motion: reduce) {
  .travel-stamp {
    transform: none;
  }
}
.stamp-signature {
  font-size: 7px;
  letter-spacing: 1.5px;
}
.is-collectible .stamp-ring {
  width: 164px;
  min-height: 180px;
  padding: 22px 16px;
  gap: 7px;
  border-width: 2px;
  outline-offset: -7px;
  background: rgba(var(--v-theme-primary), 0.035);
  opacity: 1;
}
.is-collectible .stamp-ring strong {
  font-size: 15px;
  line-height: 1.25;
  letter-spacing: 0.7px;
}
.is-collectible .stamp-signature {
  font-size: 8px;
}
.is-collectible {
  transform: none;
  transition: transform 280ms ease;
}
.is-collectible .stamp-ring {
  position: relative;
  overflow: hidden;
  box-shadow: 0 3px 6px #253c3010;
  transition:
    box-shadow 280ms ease,
    background-color 280ms ease;
}
.is-collectible .stamp-ring::after {
  content: "";
  position: absolute;
  inset: -35% -80%;
  pointer-events: none;
  background: linear-gradient(
    115deg,
    transparent 38%,
    #fffdf044 45%,
    #ffffffb0 50%,
    #fffdf044 55%,
    transparent 62%
  );
  transform: translateX(-65%);
  opacity: 0;
  transition:
    transform 700ms ease,
    opacity 240ms ease;
}
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .is-collectible:hover {
    transform: translateY(-3px) scale(1.02);
  }
  .is-collectible:hover .stamp-ring {
    box-shadow: 0 8px 15px #253c3026;
    background-color: rgba(var(--v-theme-primary), 0.055);
  }
  .is-collectible:hover .stamp-ring::after {
    transform: translateX(65%);
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .is-collectible,
  .is-collectible .stamp-ring,
  .is-collectible .stamp-ring::after {
    transition: none;
  }
  .is-collectible .stamp-ring::after {
    display: none;
  }
}
</style>
