<script setup lang="ts">
import type { JournalTrip } from "~/types/tripdex";
import CountryFlag from "~/components/tripdex/CountryFlag.vue";

const props = defineProps<{ trip: JournalTrip }>();
const dateLabel = computed<string>(() => {
  const start = new Date(props.trip.startDate).toLocaleDateString("fr-FR", {
    dateStyle: "medium",
  });
  if (!props.trip.endDate) return start;
  return `${start} → ${new Date(props.trip.endDate).toLocaleDateString("fr-FR", { dateStyle: "medium" })}`;
});
const duration = computed<string | null>(() => {
  if (!props.trip.endDate) return null;
  const days = Math.round(
    (new Date(props.trip.endDate).getTime() -
      new Date(props.trip.startDate).getTime()) /
      86400000,
  );
  return `${Math.max(1, days)} ${days > 1 ? "jours" : "jour"}`;
});
</script>

<template>
  <VSheet class="trip-metadata" border rounded="lg">
    <div class="metadata-block metadata-countries">
      <div>
        <span>Pays</span>
        <strong v-for="country in trip.countries" :key="country.id">
          <CountryFlag :iso2="country.iso2" :name="country.name" />
          {{ country.name }}
        </strong>
        <VIcon
          v-if="!trip.countries.length"
          icon="mdi-earth"
          size="20"
          aria-label="Pays non renseigné"
        />
      </div>
    </div>
    <div class="metadata-block">
      <VIcon icon="mdi-map-marker-outline" size="20" />
      <div>
        <span>Villes</span
        ><strong
          >{{ trip.cities?.length ?? 0 }}
          {{ trip.cities?.length === 1 ? "ville" : "villes" }}</strong
        >
      </div>
    </div>
    <div class="metadata-block">
      <VIcon icon="mdi-calendar-range-outline" size="20" />
      <div>
        <span>Dates</span><strong>{{ dateLabel }}</strong>
      </div>
    </div>
    <div v-if="duration" class="metadata-block">
      <VIcon icon="mdi-timer-outline" size="20" />
      <div>
        <span>Durée</span><strong>{{ duration }}</strong>
      </div>
    </div>
    <div v-if="trip.rating" class="metadata-block">
      <VIcon icon="mdi-star-outline" size="20" />
      <div>
        <span>Note</span><strong>{{ trip.rating }} / 5</strong>
      </div>
    </div>
  </VSheet>
</template>

<style scoped>
.trip-metadata {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  width: 100%;
  padding: 24px 8px;
}
.metadata-block {
  padding: 0 20px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  color: rgb(var(--v-theme-primary));
}
.metadata-block + .metadata-block {
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.metadata-block div {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.metadata-block span {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.metadata-block strong {
  overflow: hidden;
  color: rgb(var(--v-theme-on-surface));
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
}
@media (max-width: 959px) {
  .metadata-block {
    padding: 0;
  }
  .metadata-block + .metadata-block {
    border-left: none;
  }
  .trip-metadata {
    grid-template-columns: repeat(2, 1fr);
    gap: 18px 12px;
    padding: 18px;
  }
}
@media (max-width: 380px) {
  .trip-metadata {
    grid-template-columns: 1fr;
  }
}
</style>
