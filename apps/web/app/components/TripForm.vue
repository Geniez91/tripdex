<script setup lang="ts">
import type { City, Country, CreatedTrip } from "~/types/tripdex";
import { toCreateTripInput } from "~/services/mappers/tripMapper";
import { createTrip, updateTripCover } from "~/services/api/trips";
import { statusCodeFrom } from "~/services/errors";

const props = defineProps<{ countries: Country[]; loading: boolean }>();
const emit = defineEmits<{ created: [trip: CreatedTrip] }>();
const api = useTripdexApi();
const communityActivity = useCommunityActivity();
const tripsCache = useTrips();
const progression = useProgression();
const config = useRuntimeConfig();
const title = ref("");
const startDate = ref("");
const endDate = ref("");
const rating = ref<number | null>(null);
const review = ref("");
const visibility = ref<"public" | "private">("private");
const search = ref("");
const countryIds = ref<string[]>([]);
const cityIds = ref<string[]>([]);
const submitting = ref(false);
const error = ref("");
const cover = ref<File | null>(null);
const uploading = ref(false);
const savedTrip = ref<CreatedTrip | null>(null);
const { data: cities } = await useFetch<City[]>("/cities", {
  baseURL: config.public.apiBase,
  server: false,
  default: () => [],
});
const filteredCountries = computed<Country[]>(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return props.countries.filter((country) =>
    `${country.name} ${country.iso2} ${country.iso3}`
      .toLocaleLowerCase()
      .includes(query),
  );
});
const selectedCountries = computed<Country[]>(() =>
  props.countries.filter((country) => countryIds.value.includes(country.id)),
);
const availableCities = computed<City[]>(() =>
  (cities.value ?? []).filter((city) =>
    countryIds.value.includes(city.countryId),
  ),
);

async function submit(): Promise<void> {
  if (submitting.value) return;
  error.value = "";
  if (!countryIds.value.length) {
    error.value = "Sélectionnez au moins un pays.";
    return;
  }
  submitting.value = true;
  try {
    const trip =
      savedTrip.value ??
      (await createTrip(
        api,
        toCreateTripInput({
          title: title.value,
          startDate: startDate.value,
          endDate: endDate.value,
          countryIds: countryIds.value,
          cityIds: cityIds.value,
          rating: rating.value,
          review: review.value,
          visibility: visibility.value,
        }),
      ));
    if (!savedTrip.value) {
      tripsCache.invalidate();
      progression.invalidate();
      if (trip.visibility === "public") communityActivity.invalidate();
    }
    savedTrip.value = trip;
    if (cover.value) {
      uploading.value = true;
      const body = new FormData();
      body.append("cover", cover.value);
      const result = await updateTripCover(api, trip.id, body);
      Object.assign(trip, result);
      tripsCache.invalidate();
      if (trip.visibility === "public") communityActivity.invalidate();
    }
    title.value = "";
    startDate.value = "";
    endDate.value = "";
    rating.value = null;
    review.value = "";
    visibility.value = "private";
    search.value = "";
    countryIds.value = [];
    cityIds.value = [];
    cover.value = null;
    savedTrip.value = null;
    emit("created", trip);
  } catch (cause) {
    const status = statusCodeFrom(cause);
    error.value = savedTrip.value
      ? "Le voyage est enregistré, mais l’envoi de la cover a échoué. Réessayez ou retirez la sélection pour terminer sans cover."
      : status === 400
        ? "Vérifiez le titre, les dates et les pays sélectionnés."
        : status === 401
          ? "Utilisateur de développement indisponible. Vérifiez la configuration de l’API et son seed."
          : "Enregistrement non confirmé. Vérifiez votre connexion avant de réessayer.";
  } finally {
    submitting.value = false;
    uploading.value = false;
  }
}
</script>

<template>
  <section class="trip-panel" aria-labelledby="trip-form-title">
    <div class="panel-heading">
      <span class="eyebrow">LE PROCHAIN SOUVENIR</span>
      <h2 id="trip-form-title">Logger un voyage</h2>
      <p>Un titre, des dates, et les pays qui ont fait partie de l’aventure.</p>
    </div>
    <form @submit.prevent="submit">
      <fieldset
        :disabled="submitting || loading || !countries.length"
        class="form-fields"
      >
        <fieldset class="form-fields" :disabled="!!savedTrip">
          <div class="field">
            <label for="trip-title">Titre du voyage</label>
            <input
              id="trip-title"
              v-model="title"
              name="title"
              placeholder="Japan 2026"
              required
              maxlength="160"
            />
          </div>
          <div class="date-fields">
            <div class="field">
              <label for="start-date">Début</label>
              <input
                id="start-date"
                v-model="startDate"
                name="startDate"
                type="date"
                required
              />
            </div>
            <div class="field">
              <label for="end-date"
                >Fin <span class="optional">facultatif</span></label
              >
              <input
                id="end-date"
                v-model="endDate"
                name="endDate"
                type="date"
                :min="startDate || undefined"
              />
            </div>
          </div>
          <div class="field">
            <label for="trip-rating">Note</label>
            <select id="trip-rating" v-model="rating">
              <option :value="null">Non noté</option>
              <option
                v-for="value in [1, 2, 3, 4, 5]"
                :key="value"
                :value="value"
              >
                {{ "★".repeat(value) }}
              </option>
            </select>
          </div>
          <div class="field">
            <label for="trip-review">Souvenir</label>
            <textarea
              id="trip-review"
              v-model="review"
              maxlength="10000"
              rows="4"
            />
          </div>
          <div class="field">
            <label for="trip-visibility">Visibilité</label>
            <select id="trip-visibility" v-model="visibility">
              <option value="private">Privé, visible seulement par vous</option>
              <option value="public">Public, visible dans la communauté</option>
            </select>
          </div>
          <fieldset class="country-picker">
            <legend>
              Pays visités <span class="optional">1 minimum</span>
            </legend>
            <label class="sr-only" for="country-search"
              >Rechercher un pays par nom ou code ISO</label
            >
            <input
              id="country-search"
              v-model="search"
              type="search"
              placeholder="Rechercher un pays…"
              autocomplete="off"
            />
            <div class="country-options">
              <p v-if="loading" class="muted">Chargement des pays…</p>
              <p v-else-if="!filteredCountries.length" class="muted">
                Aucun pays trouvé.
              </p>
              <label
                v-for="country in filteredCountries"
                :key="country.id"
                class="country-option"
                :class="{ 'is-selected': countryIds.includes(country.id) }"
              >
                <input
                  v-model="countryIds"
                  type="checkbox"
                  :value="country.id"
                  :aria-label="country.name"
                />
                <span>{{ country.name }}</span>
                <span class="iso-label">{{ country.iso3 }}</span>
              </label>
            </div>
            <div
              v-if="selectedCountries.length"
              class="selected-countries"
              aria-live="polite"
            >
              <button
                v-for="country in selectedCountries"
                :key="country.id"
                type="button"
                class="country-chip"
                :aria-label="`Retirer ${country.name}`"
                @click="
                  countryIds = countryIds.filter((id) => id !== country.id)
                "
              >
                {{ country.name }} <span aria-hidden="true">×</span>
              </button>
            </div>
          </fieldset>
          <fieldset v-if="availableCities.length" class="country-picker">
            <legend>Villes <span class="optional">facultatif</span></legend>
            <div class="country-options">
              <label
                v-for="city in availableCities"
                :key="city.id"
                class="country-option"
              >
                <input
                  v-model="cityIds"
                  type="checkbox"
                  :value="city.id"
                  :aria-label="city.name"
                />
                <span>{{ city.name }}</span>
              </label>
            </div>
          </fieldset>
        </fieldset>
        <CoverPicker id="trip-cover" v-model="cover" :disabled="submitting" />
        <p v-if="savedTrip" class="feedback" role="status">
          Le voyage est déjà enregistré. Vous pouvez réessayer la cover sans
          créer de doublon.
        </p>
        <button
          class="primary-button"
          type="submit"
          :disabled="!countryIds.length"
          :aria-busy="submitting"
        >
          {{
            uploading
              ? "Envoi de la cover…"
              : submitting
                ? "Enregistrement…"
                : savedTrip
                  ? "Terminer l’enregistrement"
                  : "Enregistrer mon voyage"
          }}
          <span aria-hidden="true">↗</span>
        </button>
      </fieldset>
      <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    </form>
  </section>
</template>
