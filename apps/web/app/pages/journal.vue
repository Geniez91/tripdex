<script setup lang="ts">
import { journalYears } from "~/utils/journalTimeline";

const auth = useAuth();
const { trips, hasLoaded, loading, error, load } = useTrips();
onMounted(() => load());
await auth.initialize();
const tripYears = computed<(number | null)[]>(() => journalYears(trips.value));
</script>

<template>
  <main class="journal-page">
    <section class="journal-page-header">
      <div>
        <span class="eyebrow"
          ><VIcon icon="mdi-notebook-outline" size="16" /> VOTRE JOURNAL</span
        >
        <h1>Journal</h1>
        <p>Ton journal de bord, voyage après voyage.</p>
      </div>
      <VBtn
        to="/"
        color="primary"
        size="large"
        prepend-icon="mdi-book-plus-outline"
        >Ajouter au journal</VBtn
      >
    </section>
    <div
      v-if="loading || (!hasLoaded && !error)"
      class="feedback"
      role="status"
    >
      Chargement du journal…
    </div>
    <div v-else-if="error" class="feedback error" role="alert">
      Impossible de charger le journal.
      <button class="text-button" @click="load()">Réessayer</button>
    </div>
    <VSheet
      v-else-if="!trips.length"
      class="journal-empty"
      border
      rounded="lg"
      role="status"
    >
      <VIcon icon="mdi-notebook-heart-outline" size="56" color="primary" />
      <h2>Ton carnet attend sa première aventure.</h2>
      <p>Enregistre un voyage pour commencer ta collection de souvenirs.</p>
      <VBtn to="/" color="primary" prepend-icon="mdi-plus"
        >Enregistrer un premier voyage</VBtn
      >
    </VSheet>
    <section v-else class="journal-timeline" aria-label="Voyages enregistrés">
      <div v-for="(trip, index) in trips" :key="trip.id" class="timeline-item">
        <div
          v-if="index === 0 || tripYears[index] !== tripYears[index - 1]"
          class="timeline-year"
        >
          {{ tripYears[index] }}
        </div>
        <div class="timeline-marker" aria-hidden="true"><span /></div>
        <JournalEntry :trip="trip" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.journal-page {
  padding: 52px 0 24px;
}
.journal-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 42px;
}
.journal-page-header .eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.journal-page-header h1 {
  margin: 13px 0 8px;
}
.journal-page-header p {
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-size: 15px;
}
.journal-timeline {
  position: relative;
  display: grid;
  gap: 30px;
  padding-left: 76px;
}
.journal-timeline::before {
  position: absolute;
  top: 28px;
  bottom: 28px;
  left: 27px;
  width: 1px;
  background: rgba(var(--v-theme-primary), 0.22);
  content: "";
}
.timeline-item {
  position: relative;
}
.timeline-year {
  position: absolute;
  top: -22px;
  left: -76px;
  color: rgb(var(--v-theme-primary));
  font-family: Georgia, serif;
  font-size: 18px;
  font-weight: 600;
}
.timeline-marker {
  position: absolute;
  top: 30px;
  left: -55px;
  z-index: 1;
  display: grid;
  width: 14px;
  height: 14px;
  place-items: center;
  border: 1px solid rgb(var(--v-theme-primary));
  border-radius: 50%;
  background: rgb(var(--v-theme-background));
}
.timeline-marker span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
}
.journal-empty {
  display: grid;
  justify-items: center;
  gap: 14px;
  padding: 72px 24px;
  text-align: center;
}
.journal-empty h2 {
  margin: 0;
  font-size: 24px;
}
.journal-empty p {
  color: rgba(var(--v-theme-on-surface), 0.65);
}
@media (max-width: 600px) {
  .journal-page {
    padding-top: 30px;
  }
  .journal-page-header {
    align-items: flex-start;
    flex-direction: column;
    margin-bottom: 30px;
  }
  .journal-timeline {
    gap: 22px;
    padding-left: 0;
  }
  .journal-timeline::before,
  .timeline-marker {
    display: none;
  }
  .timeline-year {
    position: static;
    margin: 0 0 8px;
    font-size: 16px;
  }
}
</style>
