<script setup lang="ts">
import { formatTripPeriod } from "~/utils/dates";
import type { JournalTrip } from "~/types/tripdex";
import TripCover from "~/components/TripCover.vue";
import TravelStamp from "~/components/journal/TravelStamp.vue";
import RevisitStamp from "~/components/journal/RevisitStamp.vue";

const props = defineProps<{ trip: JournalTrip }>();
const dateLabel = computed<string>(() =>
  formatTripPeriod(props.trip.startDate, props.trip.endDate),
);
const duration = computed<string | null>(() => {
  if (!props.trip.endDate) return null;
  const days = Math.round(
    (new Date(props.trip.endDate).getTime() -
      new Date(props.trip.startDate).getTime()) /
      86400000,
  );
  return `${Math.max(1, days)} ${days > 1 ? "jours" : "jour"}`;
});
const singleCountry = computed(() =>
  props.trip.countries.length === 1 ? props.trip.countries[0] : undefined,
);
</script>

<template>
  <section
    class="trip-hero"
    :class="{ 'has-cover': trip.coverUrl }"
    aria-labelledby="trip-title"
  >
    <div class="trip-hero-actions"><slot name="actions" /></div>
    <div class="trip-hero-media">
      <TripCover
        v-if="trip.coverUrl"
        :url="trip.coverUrl"
        :title="trip.title"
      />
      <div v-else class="trip-hero-fallback" aria-hidden="true">
        <VIcon icon="mdi-notebook-outline" size="68" />
        <span>Souvenir sans photographie</span>
      </div>
    </div>
    <div class="trip-hero-overlay">
      <div class="trip-hero-copy">
        <span class="trip-hero-kicker">{{
          singleCountry?.isRevisit ? "VOYAGE RETROUVÉ" : "CARNET DE VOYAGE"
        }}</span>
        <h1 id="trip-title">{{ trip.title }}</h1>
        <p class="trip-hero-destination">
          {{ trip.countries.map(({ country }) => country.name).join(" · ") }}
        </p>
        <p v-if="trip.cities?.length" class="trip-hero-cities">
          {{ trip.cities.map((city) => city.name).join(" · ") }}
        </p>
        <p class="trip-hero-meta">
          <span
            ><VIcon icon="mdi-calendar-range-outline" size="15" />
            {{ dateLabel }}</span
          >
          <span v-if="duration"
            ><VIcon icon="mdi-timer-outline" size="15" /> {{ duration }}</span
          >
          <span v-if="trip.rating"
            ><VIcon icon="mdi-star" size="15" /> {{ trip.rating }} / 5</span
          >
        </p>
      </div>
      <RevisitStamp
        v-if="singleCountry?.isRevisit"
        :destination="singleCountry.country.name"
        :country="singleCountry.country.iso2"
        :date="trip.startDate"
        :seed="trip.id"
      />
      <TravelStamp
        v-else-if="singleCountry"
        :destination="singleCountry.country.name"
        :country="singleCountry.country.iso2"
        :date="trip.startDate"
        :seed="trip.id"
      />
    </div>
  </section>
</template>

<style scoped>
.trip-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100%;
  min-height: clamp(400px, 34vw, 500px);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 18px;
  background: rgb(var(--v-theme-ocean));
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px 32px 32px;
  gap: 72px;
}
.trip-hero-media {
  position: absolute;
  z-index: -2;
  inset: 0;
}
.trip-hero-media :deep(img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.trip-hero::after {
  position: absolute;
  z-index: -1;
  inset: 0;
  background: linear-gradient(
    0deg,
    rgba(var(--v-theme-ink), 0.8),
    rgba(13, 24, 29, 0.08) 70%,
    transparent
  );
  content: "";
  pointer-events: none;
}
.trip-hero:not(.has-cover)::after {
  background: linear-gradient(
    0deg,
    rgba(var(--v-theme-ocean), 0.92),
    transparent 85%
  );
}
.trip-hero-fallback {
  display: grid;
  place-content: start center;
  padding-top: 90px;
  justify-items: center;
  gap: 10px;
  height: 100%;
  color: rgba(var(--v-theme-primary), 0.45);
  font-size: 13px;
}
.trip-hero-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.trip-hero-overlay {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  color: white;
}
.trip-hero-copy {
  min-width: 0;
}
.trip-hero-kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.8px;
  opacity: 0.84;
}
.trip-hero-copy h1 {
  margin: 10px 0;
  color: inherit;
  font-size: clamp(34px, 4.5vw, 64px);
  line-height: 1.05;
  letter-spacing: -1.6px;
  overflow-wrap: anywhere;
}
.trip-hero-destination {
  font-size: 18px;
  opacity: 0.95;
}
.trip-hero-cities {
  margin-top: 6px;
  font-size: 14px;
  opacity: 0.85;
}
.trip-hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 18px;
  font-size: 13px;
}
.trip-hero-meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.trip-hero:not(.has-cover) .trip-hero-overlay {
  color: rgb(var(--v-theme-on-surface));
}
.trip-hero :deep(.travel-stamp),
.trip-hero :deep(.revisit-stamp) {
  flex-shrink: 0;
  color: white;
  padding: 10px;
}
.trip-hero:not(.has-cover) :deep(.travel-stamp),
.trip-hero:not(.has-cover) :deep(.revisit-stamp) {
  color: rgb(var(--v-theme-primary));
}
.trip-hero :deep(.stamp-ring),
.trip-hero :deep(.revisit-ring) {
  width: 160px;
  min-width: 0;
  height: 140px;
  padding: 16px;
  background: rgba(var(--v-theme-ink), 0.12);
}
.trip-hero :deep(.stamp-ring strong) {
  max-width: 128px;
  font-size: 15px;
}
.trip-hero :deep(.stamp-year) {
  font-size: 18px;
}
.trip-hero :deep(.stamp-ring) {
  height: auto;
  min-height: 160px;
}
.trip-hero :deep(.revisit-ring) {
  font-size: 11px;
}
@media (max-width: 959px) {
  .trip-hero {
    min-height: 380px;
    padding: 20px 24px 24px;
    gap: 64px;
  }
}
@media (max-width: 600px) {
  .trip-hero {
    min-height: 440px;
    padding: 16px;
    gap: 40px;
  }
  .trip-hero-actions {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .trip-hero-overlay {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }
  .trip-hero-copy h1 {
    font-size: clamp(28px, 8vw, 40px);
    letter-spacing: -0.8px;
  }
  .trip-hero-destination {
    font-size: 15px;
  }
  .trip-hero-meta {
    gap: 10px;
    font-size: 12px;
  }
  .trip-hero :deep(.travel-stamp),
  .trip-hero :deep(.revisit-stamp) {
    align-self: flex-end;
    padding: 4px;
  }
  .trip-hero :deep(.stamp-ring),
  .trip-hero :deep(.revisit-ring) {
    width: 112px;
    height: 92px;
    padding: 10px;
  }
  .trip-hero :deep(.stamp-ring strong) {
    max-width: 94px;
    font-size: 12px;
  }
  .trip-hero :deep(.stamp-year) {
    font-size: 12px;
  }
  .trip-hero :deep(.stamp-ring) {
    height: auto;
    min-height: 122px;
  }
}
</style>
