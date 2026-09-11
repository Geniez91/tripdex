<script setup lang="ts">
import type { Country, CreatedTrip } from "~/types/tripdex";
import { getVisitedCountries } from "~/services/api/profile";
import CommunityExplorer from "~/components/community/CommunityExplorer.vue";
import { getCountries } from "~/services/api/countries";

const config = useRuntimeConfig();
const route = useRoute();
const personalMap = computed<boolean>(() => route.path === "/profile/map");
const {
  data: countries,
  status: countriesStatus,
  error: countriesError,
  refresh: refreshCountries,
} = await useAsyncData<Country[]>(
  "explorer-countries",
  (_nuxtApp, { signal }) => getCountries(config.public.apiBase, signal),
  { server: false, default: () => [] },
);
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
      ? getVisitedCountries(api)
      : Promise.resolve([]),
  { server: false, default: () => [] },
);
const savedTrip = ref<CreatedTrip | null>(null);
const communityRevision = ref(0);
const visitedIso3 = computed<string[]>(() =>
  visited.value.map((country) => country.iso3),
);
async function onCreated(trip: CreatedTrip): Promise<void> {
  savedTrip.value = trip;
  if (auth.status.value === "authenticated") await refreshVisited();
  communityRevision.value++;
}
</script>

<template>
  <main class="explorer-page">
    <section class="explorer-hero" aria-labelledby="page-title">
      <div>
        <span class="eyebrow"
          ><span class="tiny-dot" />{{
            personalMap ? "MA CARTE" : "EXPLORER LE MONDE"
          }}</span
        >
        <h1 id="page-title">
          {{
            personalMap
              ? "Le monde, voyage après voyage."
              : "Chaque pays cache une histoire."
          }}
        </h1>
        <p>
          {{
            personalMap
              ? "Gardez vos souvenirs. Retrouvez les traces de vos voyages."
              : "Voir où voyage la communauté TripDex."
          }}
        </p>
      </div>
      <div class="explorer-signature" aria-hidden="true">
        <VIcon icon="mdi-compass-outline" size="38" /><span
          >Explore. Log. Complete.</span
        >
      </div>
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
    <div class="explorer-layout">
      <section class="map-panel" aria-labelledby="map-title">
        <div class="map-heading">
          <div>
            <span class="eyebrow">{{
              personalMap ? "VOTRE MONDE" : "L’ATLAS TRIPDEX"
            }}</span>
            <h2 id="map-title">
              {{
                personalMap
                  ? "Les traces de vos voyages"
                  : "Le monde au rythme de la communauté"
              }}
            </h2>
          </div>
          <div v-if="personalMap" class="visited-count">
            <strong>{{
              visitedStatus === "success" ? visited.length : "—"
            }}</strong
            ><span>pays {{ visited.length > 1 ? "visités" : "visité" }}</span>
          </div>
        </div>
        <div
          v-if="personalMap && visitedError"
          class="feedback error"
          role="alert"
        >
          Impossible de récupérer vos pays visités.
          <button class="text-button" @click="refreshVisited()">
            Réessayer
          </button>
        </div>
        <CommunityExplorer
          v-if="!personalMap"
          :countries="countries"
          :revision="communityRevision"
        />
        <WorldMap
          v-else
          :visited-iso3="visitedIso3"
          :loading="visitedStatus === 'pending' || visitedStatus === 'idle'"
          :available="visitedStatus === 'success'"
          :countries="countries"
        />
        <div class="map-footer">
          <template v-if="!personalMap">
            <span class="footer-symbol" aria-hidden="true"
              ><VIcon icon="mdi-map-marker-outline" size="22"
            /></span>
            <div>
              <strong>Une destination. Le début d’une histoire.</strong>
              <p>
                Sélectionnez un pays sur la carte, puis gardez une trace de vos
                voyages dans votre carnet.
              </p>
            </div>
            <a href="#trip-form-title" class="explorer-log-link"
              >Logger un voyage
              <VIcon icon="mdi-arrow-down" size="16" aria-hidden="true"
            /></a>
          </template>
          <template v-else-if="visitedStatus === 'success' && !visited.length"
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
      <section class="explorer-log" aria-label="Votre carnet de voyage">
        <div class="explorer-log-intro">
          <span class="eyebrow">DU MONDE À VOTRE CARNET</span>
          <h2>Les beaux voyages<br />méritent une trace.</h2>
          <p>
            Des pays traversés, des dates, un souvenir. Retrouvez chaque voyage
            dans votre journal et chaque pays dans votre passeport.
          </p>
          <span class="log-rule" aria-hidden="true" />
        </div>
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
            :loading="
              countriesStatus === 'pending' || countriesStatus === 'idle'
            "
            @created="onCreated"
          />
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.explorer-page {
  padding-bottom: 24px;
}
.explorer-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 38px 0 32px;
}
.explorer-hero h1 {
  font-size: clamp(30px, 3.2vw, 46px);
  color: rgb(var(--v-theme-ink));
  margin: 12px 0;
  letter-spacing: -1.5px;
}
.explorer-hero p {
  color: rgb(var(--v-theme-muted));
  font-size: 16px;
  line-height: 1.6;
}
.explorer-signature {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  color: rgb(var(--v-theme-primary));
  padding: 16px 20px;
}
.explorer-signature .v-icon {
  border-radius: 50%;
  outline: 1px solid rgba(var(--v-theme-primary), 0.18);
  outline-offset: 10px;
  background: rgba(var(--v-theme-sun), 0.2);
}
.explorer-signature span {
  font-size: 10px;
  letter-spacing: 1.2px;
  margin-top: 8px;
}
.explorer-layout {
  display: grid;
  gap: 48px;
}
.map-panel {
  border-color: rgb(var(--v-theme-outline));
  background: rgb(var(--v-theme-surface));
  border-radius: var(--tripdex-radius-lg);
  box-shadow: 0 12px 30px rgba(var(--v-theme-ink), 0.055);
}
.map-heading {
  padding: 24px 28px 0;
}
.map-heading h2 {
  color: rgb(var(--v-theme-ink));
  margin-top: 6px;
}
.map-footer {
  background: rgba(var(--v-theme-ocean), 0.45);
  border-color: rgb(var(--v-theme-outline));
  min-height: 92px;
}
.map-footer p,
.visited-count span {
  color: rgb(var(--v-theme-muted));
}
.footer-symbol {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-sun), 0.2);
}
.explorer-log-link {
  margin-left: auto;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 650;
  color: rgb(var(--v-theme-primary));
  text-underline-offset: 5px;
}
.explorer-log {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 64px;
  align-items: start;
}
.explorer-log-intro {
  padding: 30px 0;
  max-width: 420px;
}
.explorer-log-intro h2 {
  font-size: clamp(26px, 3vw, 36px);
  line-height: 1.25;
  margin: 16px 0;
  color: rgb(var(--v-theme-ink));
}
.explorer-log-intro p {
  color: rgb(var(--v-theme-muted));
  font-size: var(--tripdex-body-size);
  line-height: 1.8;
}
.log-rule {
  display: block;
  height: 3px;
  width: 54px;
  margin-top: 24px;
  background: rgb(var(--v-theme-sun));
  border-radius: 3px;
}
.explorer-log :deep(.trip-panel) {
  background: rgb(var(--v-theme-surface));
  border-color: rgb(var(--v-theme-outline));
  border-radius: var(--tripdex-radius-lg);
}
.explorer-log :deep(.panel-heading p),
.explorer-log :deep(.optional),
.explorer-log :deep(.iso-label) {
  color: rgb(var(--v-theme-muted));
}
.explorer-log :deep(input),
.explorer-log :deep(select),
.explorer-log :deep(textarea) {
  color: rgb(var(--v-theme-on-surface));
  border-color: rgb(var(--v-theme-outline));
  background: rgb(var(--v-theme-surface));
}
.explorer-log :deep(input::placeholder) {
  color: rgb(var(--v-theme-muted));
}
.explorer-log :deep(.country-option.is-selected),
.explorer-log :deep(.country-chip) {
  background: rgb(var(--v-theme-ocean));
  color: rgb(var(--v-theme-primary));
}
.explorer-log :deep(.country-option input) {
  accent-color: rgb(var(--v-theme-primary));
}
:deep(#trip-form-title) {
  scroll-margin-top: 24px;
}
@media (max-width: 1050px) {
  .explorer-log {
    gap: 32px;
  }
  .explorer-signature {
    padding-inline: 8px;
  }
}
@media (max-width: 600px) {
  .explorer-hero {
    padding: 28px 0;
  }
  .explorer-signature {
    display: none;
  }
  .explorer-hero h1 {
    font-size: 32px;
    letter-spacing: -1px;
  }
  .explorer-hero p {
    font-size: 14px;
  }
  .map-heading {
    padding: 20px 18px 0;
  }
  .map-footer {
    flex-wrap: wrap;
    gap: 12px;
  }
  .map-footer > div {
    flex: 1;
  }
  .explorer-log-link {
    margin-left: 52px;
    flex-basis: 100%;
  }
  .explorer-layout {
    gap: 28px;
  }
  .explorer-log {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
  .explorer-log-intro {
    padding: 12px 2px 0;
  }
}
</style>
