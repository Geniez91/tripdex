<script setup lang="ts">
import type { Country, CreatedTrip } from "~/types/tripdex";

const config = useRuntimeConfig();
const {
  data: countries,
  status: countriesStatus,
  error: countriesError,
  refresh: refreshCountries,
} = await useFetch<Country[]>("/countries", {
  baseURL: config.public.apiBase,
  server: false,
  default: () => [],
});
const auth = useAuth();
const api = useTripdexApi();
await auth.initialize();
const {
  data: visited,
  status: visitedStatus,
  error: visitedError,
  refresh: refreshVisited,
} = await useAsyncData<Country[]>(
  "private-visited-countries",
  () =>
    auth.status.value === "authenticated"
      ? api.get<Country[]>("/me/visited-countries")
      : Promise.resolve([]),
  { server: false, default: () => [] },
);
const savedTrip = ref<CreatedTrip | null>(null);
const visitedIso3 = computed(() =>
  visited.value.map((country) => country.iso3),
);
async function onCreated(trip: CreatedTrip) {
  savedTrip.value = trip;
  if (auth.status.value === "authenticated") await refreshVisited();
}
</script>

<template>
  <main>
    <section class="hero" aria-labelledby="page-title">
      <span class="eyebrow"
        ><span class="tiny-dot" /> CHAQUE VOYAGE LAISSE UNE TRACE</span
      >
      <h1 id="page-title">Le monde, <em>voyage après voyage.</em></h1>
      <p>Gardez vos souvenirs. Voyez votre carte se remplir.</p>
    </section>
    <div v-if="savedTrip" class="feedback success" role="status">
      <strong>« {{ savedTrip.title }} » est enregistré.</strong>
      {{
        visitedStatus === "pending"
          ? "Actualisation de votre carte…"
          : visitedError
            ? "La carte n’a pas encore pu être actualisée."
            : "Votre carte est à jour."
      }}
    </div>
    <div class="journal-layout">
      <section class="map-panel" aria-labelledby="map-title">
        <div class="map-heading">
          <div>
            <span class="eyebrow">VOTRE MONDE</span>
            <h2 id="map-title">Les traces de vos voyages</h2>
          </div>
          <div class="visited-count">
            <strong>{{
              visitedStatus === "success" ? visited.length : "—"
            }}</strong
            ><span>pays {{ visited.length > 1 ? "visités" : "visité" }}</span>
          </div>
        </div>
        <div v-if="visitedError" class="feedback error" role="alert">
          Impossible de récupérer vos pays visités.
          <button class="text-button" @click="refreshVisited()">
            Réessayer
          </button>
        </div>
        <WorldMap
          :visited-iso3="visitedIso3"
          :loading="visitedStatus === 'pending' || visitedStatus === 'idle'"
          :available="visitedStatus === 'success'"
        />
        <div class="map-footer">
          <template v-if="visitedStatus === 'success' && !visited.length"
            ><span class="footer-symbol" aria-hidden="true">↗</span>
            <div>
              <strong>Votre histoire commence ici.</strong>
              <p>
                Loggez votre premier voyage : ses pays prendront couleur sur la
                carte.
              </p>
            </div></template
          ><template v-else-if="visitedStatus === 'success'"
            ><span class="footer-symbol" aria-hidden="true">✓</span>
            <div>
              <strong>Votre carnet prend vie.</strong>
              <p>{{ visited.map((country) => country.name).join(" · ") }}</p>
            </div></template
          >
          <p v-else class="muted">
            {{
              visitedError
                ? "Vos voyages restent enregistrés. Réessayez de charger la carte."
                : "Chargement de votre carnet…"
            }}
          </p>
        </div>
      </section>
      <div>
        <div v-if="countriesError" class="feedback error" role="alert">
          Impossible de charger les pays.
          <button class="text-button" @click="refreshCountries()">
            Réessayer
          </button>
        </div>
        <div
          v-else-if="countriesStatus === 'success' && !countries.length"
          class="feedback error"
          role="alert"
        >
          Aucun pays disponible. Le référentiel doit être initialisé côté API.
        </div>
        <TripForm
          :countries="countries"
          :loading="countriesStatus === 'pending' || countriesStatus === 'idle'"
          @created="onCreated"
        />
      </div>
    </div>
  </main>
</template>
