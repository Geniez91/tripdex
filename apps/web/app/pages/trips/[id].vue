<script setup lang="ts">
import type { JournalTrip } from "~/types/tripdex";
import TripHero from "~/components/trips/TripHero.vue";
import TripMetadata from "~/components/trips/TripMetadata.vue";
import CountryFlag from "~/components/tripdex/CountryFlag.vue";
import { statusCodeFrom } from "~/services/errors";
import {
  getTrip,
  removeTripCover,
  updateTripCover,
} from "~/services/api/trips";

const route = useRoute();
const api = useTripdexApi();
const tripsCache = useTrips();
const {
  data: trip,
  status,
  error,
  refresh,
} = await useAsyncData<JournalTrip>(
  `private-trip-${route.params.id}`,
  () => getTrip(api, String(route.params.id)),
  { server: false },
);
const coverDialog = ref(false);
const cover = ref<File | null>(null);
const changingCover = ref(false);
const coverError = ref("");
const coverMessage = ref("");
async function changeCover(remove = false): Promise<void> {
  if (!trip.value || changingCover.value) return;
  changingCover.value = true;
  coverError.value = "";
  coverMessage.value = "";
  try {
    const body = new FormData();
    if (cover.value) body.append("cover", cover.value);
    const result = remove
      ? await removeTripCover(api, trip.value.id)
      : await updateTripCover(api, trip.value.id, body);
    Object.assign(trip.value, result);
    tripsCache.invalidate();
    cover.value = null;
    coverDialog.value = false;
    coverMessage.value = remove ? "Cover supprimée." : "Cover enregistrée.";
  } catch (cause) {
    const statusCode = statusCodeFrom(cause);
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
    <NuxtLink v-if="!trip" to="/journal" class="back-to-journal">
      <VIcon icon="mdi-arrow-left" size="18" /> Retour au journal
    </NuxtLink>
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
    <div v-else-if="trip" class="trip-detail-content">
      <TripHero :trip="trip">
        <template #actions>
          <NuxtLink to="/journal" class="hero-back"
            ><VIcon icon="mdi-arrow-left" size="18" /> Retour au
            journal</NuxtLink
          >
          <VBtn
            class="cover-trigger"
            prepend-icon="mdi-camera-outline"
            :disabled="changingCover"
            @click="coverDialog = true"
          >
            {{
              trip.coverUrl
                ? "Modifier la couverture"
                : "Ajouter une couverture"
            }}
          </VBtn>
        </template>
      </TripHero>
      <VDialog
        v-model="coverDialog"
        max-width="560"
        :persistent="changingCover"
        aria-labelledby="cover-dialog-title"
      >
        <VCard class="cover-dialog">
          <h2 id="cover-dialog-title">Couverture du voyage</h2>
          <div class="cover-actions">
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
          </div>
          <p v-if="coverError" role="alert" class="feedback error">
            {{ coverError }}
          </p>
          <VBtn
            variant="text"
            :disabled="changingCover"
            @click="coverDialog = false"
            >Fermer</VBtn
          >
        </VCard>
      </VDialog>
      <p v-if="changingCover" role="status">Modification de la cover…</p>
      <p v-if="coverMessage" role="status">{{ coverMessage }}</p>
      <p v-if="coverError" role="alert" class="feedback error">
        {{ coverError }}
      </p>
      <TripMetadata :trip="trip" />
      <section
        v-if="trip.cities?.length"
        class="visited-cities"
        aria-labelledby="cities-title"
      >
        <span class="section-kicker">LES ESCALES DU VOYAGE</span>
        <h2 id="cities-title">Villes visitées</h2>
        <ul class="city-list">
          <li
            v-for="(city, index) in trip.cities"
            :key="city.id"
            class="city-name"
          >
            <span class="city-number" aria-hidden="true">{{ index + 1 }}</span>
            <div>
              <h3>{{ city.name }}</h3>
              <p>
                {{
                  trip.countries.find(
                    (country) => country.id === city.countryId,
                  )?.name
                }}
              </p>
            </div>
          </li>
        </ul>
      </section>
      <section
        v-if="trip.review?.trim()"
        class="trip-memory"
        aria-labelledby="memory-title"
      >
        <h2 id="memory-title">
          <CountryFlag
            v-if="trip.countries.length === 1"
            :iso2="trip.countries[0]?.iso2"
            :name="trip.countries[0]?.name"
          />
          <VIcon v-else icon="mdi-earth" aria-hidden="true" /> Mon souvenir
        </h2>
        <blockquote>
          <span class="memory-quote" aria-hidden="true">“</span>
          <p>{{ trip.review }}</p>
        </blockquote>
      </section>
    </div>
  </main>
</template>

<style scoped>
.trip-detail {
  width: 100%;
  max-width: none;
  padding: 28px 0 64px;
}
.trip-detail-content {
  display: grid;
  gap: 28px;
  width: 100%;
}
.back-to-journal,
.hero-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
}
.hero-back,
.cover-trigger {
  color: white;
  background: rgba(15, 28, 24, 0.36);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
}
.hero-back {
  padding: 10px 12px;
}
.cover-trigger {
  text-transform: none;
  letter-spacing: 0;
}
.cover-dialog {
  padding: 24px;
  gap: 20px;
}
.cover-actions .form-fields {
  margin: 0;
}
.trip-detail-content > .feedback {
  margin: 0;
}
.visited-cities {
  padding: 16px 0;
}
.section-kicker {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.6px;
}
.visited-cities h2,
.trip-memory h2 {
  margin: 8px 0 24px;
  font-size: 26px;
}
.city-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  padding: 0;
  list-style: none;
}
.city-name {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px;
  border: 1px solid rgba(var(--v-theme-primary), 0.16);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.65);
  transition:
    box-shadow 180ms ease,
    transform 180ms ease;
}
.city-name:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(30, 50, 40, 0.07);
}
.city-number {
  display: grid;
  place-items: center;
  flex: 0 0 40px;
  height: 40px;
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  border-radius: 50%;
  color: rgb(var(--v-theme-primary));
  font-family: Georgia, serif;
  font-size: 20px;
}
.city-name h3 {
  font-size: 18px;
  overflow-wrap: anywhere;
}
.city-name p {
  margin-top: 5px;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.trip-memory {
  padding: clamp(24px, 4vw, 56px);
  background: rgb(var(--v-theme-ocean));
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
  border-radius: 16px;
}
.trip-memory h2 {
  display: flex;
  align-items: center;
  gap: 12px;
}
.trip-memory blockquote {
  position: relative;
  margin: 0;
  padding: 30px 0 0 32px;
}
.memory-quote {
  position: absolute;
  top: -20px;
  left: 0;
  color: rgba(var(--v-theme-primary), 0.16);
  font-family: Georgia, serif;
  font-size: 100px;
  line-height: 1;
}
.trip-memory p {
  position: relative;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.8);
  font-family: Georgia, serif;
  font-size: clamp(18px, 1.7vw, 25px);
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
@media (max-width: 600px) {
  .trip-detail {
    padding-top: 16px;
  }
  .trip-detail-content {
    gap: 20px;
  }
  .hero-back {
    padding: 8px;
    font-size: 12px;
  }
  .cover-trigger {
    font-size: 12px;
  }
  .city-list {
    grid-template-columns: 1fr;
  }
  .trip-memory blockquote {
    padding-left: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .city-name {
    transition: none;
  }
  .city-name:hover {
    transform: none;
  }
}
</style>
