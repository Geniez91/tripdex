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
const cover = ref<File | null>(null);
const changingCover = ref(false);
const coverError = ref("");
const coverMessage = ref("");
async function changeCover(remove = false) {
  if (!trip.value || changingCover.value) return;
  changingCover.value = true;
  coverError.value = "";
  coverMessage.value = "";
  try {
    const body = new FormData();
    if (cover.value) body.append("cover", cover.value);
    const result = await $fetch<{
      coverStoragePath: string | null;
      coverUrl: string | null;
      cleanupPending: boolean;
    }>(`/me/trips/${trip.value.id}/cover`, {
      baseURL: config.public.apiBase,
      method: remove ? "DELETE" : "PUT",
      body: remove ? undefined : body,
      retry: 0,
    });
    Object.assign(trip.value, result);
    cover.value = null;
    coverMessage.value = remove ? "Cover supprimée." : "Cover enregistrée.";
  } catch (cause) {
    const statusCode = (cause as { statusCode?: number }).statusCode;
    coverError.value =
      statusCode === 409
        ? "La cover a été modifiée ailleurs. Rechargez le voyage puis réessayez."
        : "Modification de la cover non confirmée. Votre sélection est conservée ; réessayez.";
  } finally {
    changingCover.value = false;
  }
}
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
      <TripCover
        class="detail-cover"
        :url="trip.coverUrl"
        :title="trip.title"
      />
      <fieldset class="form-fields" :disabled="changingCover">
        <CoverPicker
          id="detail-cover"
          v-model="cover"
          :disabled="changingCover"
        />
        <button
          v-if="cover"
          class="text-button"
          type="button"
          @click="changeCover()"
        >
          Enregistrer la cover
        </button>
        <button
          v-if="trip.coverStoragePath"
          class="text-button"
          type="button"
          @click="changeCover(true)"
        >
          Supprimer la cover
        </button>
      </fieldset>
      <p v-if="changingCover" role="status">Modification de la cover…</p>
      <p v-if="coverMessage" role="status">{{ coverMessage }}</p>
      <p v-if="coverError" role="alert" class="feedback error">
        {{ coverError }}
      </p>
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
