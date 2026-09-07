<script setup lang="ts">
import type { JournalTrip } from "~/types/tripdex";

const config = useRuntimeConfig();
const { data, status, error, refresh } = await useFetch<JournalTrip[]>(
  "/me/trips",
  {
    baseURL: config.public.apiBase,
    server: false,
    default: () => [],
  },
);
const trips = computed(() => data.value ?? []);
</script>

<template>
  <main>
    <section class="hero">
      <span class="eyebrow">VOTRE JOURNAL</span>
      <h1>Voyage après voyage.</h1>
      <p>Retrouvez vos souvenirs dans l’ordre de vos départs.</p>
    </section>
    <div
      v-if="status === 'pending' || status === 'idle'"
      class="feedback"
      role="status"
    >
      Chargement du journal…
    </div>
    <div v-else-if="error" class="feedback error" role="alert">
      Impossible de charger le journal.
      <button class="text-button" @click="refresh()">Réessayer</button>
    </div>
    <div v-else-if="!trips.length" class="feedback" role="status">
      Votre journal est encore vide.
      <NuxtLink to="/">Logger un voyage</NuxtLink>
    </div>
    <section v-else class="journal-list" aria-label="Voyages enregistrés">
      <article v-for="trip in trips" :key="trip.id" class="journal-entry">
        <div v-if="trip.coverStoragePath" class="entry-cover">
          <img :src="trip.coverStoragePath" :alt="`Cover de ${trip.title}`" />
        </div>
        <div class="entry-body">
          <div class="entry-meta">
            <time :datetime="trip.startDate">{{
              new Date(trip.startDate).toLocaleDateString("fr-FR")
            }}</time
            ><span v-if="trip.isRevisit" class="revisit">REVISIT</span>
          </div>
          <h2>
            <NuxtLink :to="`/trips/${trip.id}`">{{ trip.title }}</NuxtLink>
          </h2>
          <p>
            {{ trip.countries.map((country) => country.name).join(" · ") }}
          </p>
          <p
            v-if="trip.rating"
            class="stars"
            :aria-label="`${trip.rating} sur 5`"
          >
            {{ "★".repeat(trip.rating)
            }}<span>{{ "★".repeat(5 - trip.rating) }}</span>
          </p>
        </div>
      </article>
    </section>
  </main>
</template>
