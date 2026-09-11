<script setup lang="ts">
import { formatDate, formatTripPeriod } from "~/utils/dates";
import type { Country, JournalTrip } from "~/types/tripdex";
import TravelStamp from "~/components/journal/TravelStamp.vue";
import RevisitStamp from "~/components/journal/RevisitStamp.vue";

const props = defineProps<{ trip: JournalTrip }>();
const firstCountry = computed<
  Pick<Country, "id" | "iso2" | "iso3" | "name"> | undefined
>(() => props.trip.countries[0]);
const countries = computed<string>(() =>
  props.trip.countries.map((country) => country.name).join(" · "),
);
const cities = computed<string>(
  () => props.trip.cities?.map((city) => city.name).join(" · ") ?? "",
);
const photoCaption = computed<string>(() => {
  const date = formatDate(props.trip.startDate, "caption");
  return `${firstCountry.value?.name ?? "VOYAGE"} · ${date}`.toUpperCase();
});
const dateLabel = computed<string>(() =>
  formatTripPeriod(props.trip.startDate, props.trip.endDate),
);
</script>

<template>
  <VCard
    tag="article"
    class="journal-entry-card"
    :aria-label="`Voyage ${trip.title}`"
  >
    <NuxtLink class="journal-entry-link" :to="`/trips/${trip.id}`">
      <div class="journal-photo" :class="{ 'is-empty': !trip.coverUrl }">
        <TripCover
          v-if="trip.coverUrl"
          :url="trip.coverUrl"
          :title="trip.title"
        />
        <div v-else class="photo-fallback" aria-hidden="true">
          <VIcon icon="mdi-image-outline" size="36" />
          <span>Souvenir à ajouter</span>
        </div>
        <span class="photo-caption">{{ photoCaption }}</span>
      </div>
      <div class="journal-entry-content">
        <div class="journal-entry-topline">
          <span class="journal-kicker">CARNET DE VOYAGE</span>
          <RevisitStamp
            v-if="trip.isRevisit"
            :destination="firstCountry?.name ?? 'VOYAGE'"
            :country="firstCountry?.iso2"
            :date="trip.startDate"
            :seed="trip.id"
          />
          <TravelStamp
            v-else
            :destination="firstCountry?.name ?? 'VOYAGE'"
            :country="firstCountry?.iso2"
            :date="trip.startDate"
            :seed="trip.id"
          />
        </div>
        <h2>{{ trip.title }}</h2>
        <p class="journal-dates">
          <VIcon icon="mdi-calendar-blank-outline" size="16" /> {{ dateLabel }}
        </p>
        <p class="journal-destinations">
          <strong>{{ countries }}</strong
          ><span v-if="cities">{{ cities }}</span>
        </p>
        <p v-if="trip.review" class="journal-excerpt">“{{ trip.review }}”</p>
        <div class="journal-entry-footer">
          <span
            v-if="trip.rating"
            class="journal-rating"
            :aria-label="`${trip.rating} sur 5`"
            >{{ "★".repeat(trip.rating)
            }}<span>{{ "★".repeat(5 - trip.rating) }}</span></span
          >
          <span class="read-entry"
            >Ouvrir le souvenir <VIcon icon="mdi-arrow-top-right" size="16"
          /></span>
        </div>
      </div>
    </NuxtLink>
  </VCard>
</template>

<style scoped>
.journal-entry-card {
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}
.journal-entry-card:hover,
.journal-entry-card:focus-within {
  transform: translateY(-2px);
  box-shadow: 0 5px 16px rgba(var(--v-theme-on-surface), 0.1);
}
.journal-entry-link {
  display: grid;
  grid-template-columns: minmax(280px, 42%) 1fr;
  min-height: 290px;
  color: inherit;
  text-decoration: none;
}
.journal-entry-link:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: -3px;
}
.journal-photo {
  position: relative;
  min-height: 290px;
  background: rgba(var(--v-theme-primary), 0.08);
  overflow: hidden;
}
.journal-photo :deep(img) {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 290px;
  object-fit: cover;
  transition: transform 300ms ease;
}
.journal-entry-link:hover .journal-photo :deep(img) {
  transform: scale(1.025);
}
.journal-photo::after {
  content: "";
  position: absolute;
  inset: 12px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  pointer-events: none;
}
.photo-fallback {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  height: 100%;
  min-height: 290px;
  color: rgba(var(--v-theme-primary), 0.7);
  font-size: 12px;
}
.photo-caption {
  position: absolute;
  z-index: 1;
  bottom: 18px;
  left: 20px;
  color: white;
  font:
    10px ui-monospace,
    monospace;
  letter-spacing: 1.4px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
}
.journal-entry-content {
  display: flex;
  flex-direction: column;
  padding: 30px 34px 26px;
}
.journal-entry-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-height: 96px;
}
.journal-kicker {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.7px;
}
.journal-entry-content h2 {
  margin: 10px 0 12px;
  font-size: clamp(24px, 3vw, 36px);
  line-height: 1.12;
  letter-spacing: -0.9px;
}
.journal-dates,
.journal-destinations {
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 13px;
}
.journal-destinations {
  align-items: flex-start;
  flex-direction: column;
  gap: 2px;
  margin-top: 13px;
}
.journal-destinations strong {
  color: rgb(var(--v-theme-primary));
  font-size: 14px;
}
.journal-excerpt {
  display: -webkit-box;
  margin: 18px 0 0;
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-family: Georgia, serif;
  font-size: 16px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.journal-entry-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding-top: 22px;
}
.journal-rating {
  color: rgb(var(--v-theme-secondary));
  letter-spacing: 2px;
}
.journal-rating span {
  color: rgba(var(--v-theme-on-surface), 0.2);
}
.read-entry {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgb(var(--v-theme-primary));
  font-size: 12px;
  font-weight: 650;
}
@media (max-width: 700px) {
  .journal-entry-link {
    grid-template-columns: 1fr;
  }
  .journal-photo,
  .journal-photo :deep(img),
  .photo-fallback {
    min-height: 240px;
  }
  .journal-entry-content {
    padding: 24px 22px 22px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .journal-entry-card,
  .journal-photo :deep(img) {
    transition: none;
  }
}
</style>
