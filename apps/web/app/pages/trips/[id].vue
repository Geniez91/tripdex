<script setup lang="ts">
import type { JournalTrip } from "~/types/tripdex";

const route = useRoute();
const config = useRuntimeConfig();
const {
  data: trip,
  status,
  error,
  refresh,
} = await useFetch<JournalTrip>(`/me/trips/${route.params.id}`, {
  baseURL: config.public.apiBase,
  server: false,
});
</script>

<template>
  <main class="trip-detail">
    <div
      v-if="status === 'pending' || status === 'idle'"
      class="feedback"
      role="status"
    >
      Chargement…
    </div>
    <div v-else-if="error" class="feedback error" role="alert">
      Ce voyage est introuvable.
      <button class="text-button" @click="refresh()">Réessayer</button>
    </div>
    <article v-else-if="trip">
      <img
        v-if="trip.coverStoragePath"
        class="detail-cover"
        :src="trip.coverStoragePath"
        :alt="`Cover de ${trip.title}`"
      />
      <span v-if="trip.isRevisit" class="revisit">REVISIT</span>
      <h1>{{ trip.title }}</h1>
      <p class="detail-dates">
        {{ new Date(trip.startDate).toLocaleDateString("fr-FR")
        }}<span v-if="trip.endDate">
          → {{ new Date(trip.endDate).toLocaleDateString("fr-FR") }}</span
        >
      </p>
      <p class="stars" v-if="trip.rating" :aria-label="`${trip.rating} sur 5`">
        {{ "★".repeat(trip.rating)
        }}<span>{{ "★".repeat(5 - trip.rating) }}</span>
      </p>
      <h2>Destinations</h2>
      <p>{{ trip.countries.map((country) => country.name).join(" · ") }}</p>
      <p v-if="trip.review" class="detail-review">{{ trip.review }}</p>
    </article>
  </main>
</template>
