<script setup lang="ts">
import type { CommunityCountryExplorer } from '~/types/interfaces/community-country-explorer';
import type { Country } from '~/types/tripdex';
import { formatTripPeriod } from '~/utils/dates';
import CountryFlag from '~/components/tripdex/CountryFlag.vue';

const props = defineProps<{
  country?: Pick<Country, 'iso2' | 'name'> | null;
  detail: CommunityCountryExplorer | null;
  loading: boolean;
  failed: boolean;
}>();
const emit = defineEmits<{ close: [] }>();
const titleId = useId();
const displayCountry = computed(() => props.detail?.country ?? props.country ?? null);
const heroUrl = computed(
  () => props.detail?.memory?.imageUrl ?? props.detail?.recentTrips[0]?.coverUrl ?? null,
);
const heroAlt = computed(() => props.detail?.memory
  ? `Souvenir communautaire de ${props.detail.country.name}`
  : `Voyage public r\u00e9cent en ${props.detail?.country.name ?? ''}`);
const averageRating = computed(() => {
  const rating = props.detail?.stats.averageRating;
  return rating === null || rating === undefined
    ? null
    : rating.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
});
</script>

<template>
  <section class="country-panel-content" :aria-labelledby="titleId" :aria-busy="loading">
    <header class="panel-heading">
      <div>
        <span class="eyebrow">COUNTRY EXPLORER</span>
        <h2 :id="titleId">
          <CountryFlag v-if="displayCountry" :iso2="displayCountry.iso2" :name="displayCountry.name" />
          {{ displayCountry?.name ?? 'Explorer ce pays' }}
        </h2>
      </div>
      <VBtn icon="mdi-close" variant="text" color="primary" aria-label="Fermer le panneau pays" @click="emit('close')" />
    </header>

    <div v-if="loading" class="panel-state" role="status">
      <VSkeletonLoader type="image, article, list-item-three-line" />
    </div>
    <div v-else-if="failed" class="panel-state" role="alert">
      <VIcon icon="mdi-cloud-alert-outline" size="28" aria-hidden="true" />
      <p>Les informations de ce pays sont temporairement indisponibles.</p>
    </div>
    <template v-else-if="detail">
      <div class="country-hero" :class="{ 'hero-with-image': heroUrl }">
        <VImg v-if="heroUrl" :src="heroUrl" :alt="heroAlt" cover />
        <VIcon v-else icon="mdi-earth" size="42" aria-hidden="true" />
        <span class="hero-caption">{{ detail.country.iso3 }}</span>
      </div>

      <section class="country-stats" aria-label="Statistiques communautaires">
        <div class="stat-primary">
          <strong>{{ detail.stats.travelers.toLocaleString('fr-FR') }}</strong>
          <span>voyageurs TripDex</span>
        </div>
        <div class="stat-secondary">
          <div>
            <strong>{{ detail.stats.travelersNow.toLocaleString('fr-FR') }}</strong>
            <span>actuellement sur place</span>
          </div>
          <VDivider vertical />
          <div v-if="averageRating !== null && detail.stats.ratingCount > 0">
            <strong><VIcon icon="mdi-star" size="17" color="sun" aria-hidden="true" /> {{ averageRating }}</strong>
            <span>{{ detail.stats.ratingCount.toLocaleString('fr-FR') }} {{ detail.stats.ratingCount === 1 ? 'note publique' : 'notes publiques' }}</span>
          </div>
          <div v-else>
            <strong>—</strong>
            <span>Aucune note publique</span>
          </div>
        </div>
      </section>

      <VDivider class="section-divider" />
      <section class="recent-trips" aria-labelledby="recent-trips-title">
        <div class="section-heading">
          <span class="eyebrow">DANS LE CARNET COMMUN</span>
          <h3 id="recent-trips-title">Voyages récents</h3>
        </div>
        <p v-if="!detail.recentTrips.length" class="empty-copy">Aucun voyage public enregistré pour le moment.</p>
        <VCard v-for="trip in detail.recentTrips" :key="trip.id" class="recent-trip" variant="flat">
          <VImg v-if="trip.coverUrl" class="trip-cover" :src="trip.coverUrl" :alt="`Photo du voyage ${trip.title}`" cover />
          <div v-else class="trip-cover trip-cover-empty"><VIcon icon="mdi-image-outline" aria-hidden="true" /></div>
          <div class="trip-copy">
            <strong>{{ trip.title }}</strong>
            <span>par {{ trip.user.username }}</span>
            <span>{{ formatTripPeriod(trip.startDate, trip.endDate) }}</span>
            <span v-if="trip.rating !== null" class="trip-rating" :aria-label="`Note ${trip.rating} sur 5`">{{ '★'.repeat(Math.round(trip.rating)) }}</span>
            <p v-if="trip.review">{{ trip.review }}</p>
          </div>
        </VCard>
      </section>

      <template v-if="detail.memory">
        <VDivider class="section-divider" />
        <section class="community-memory" aria-labelledby="memory-title">
          <div class="section-heading">
            <VChip size="small" color="sun" variant="tonal" prepend-icon="mdi-trophy-outline">Souvenir de la semaine</VChip>
            <h3 id="memory-title">Souvenir de la communauté</h3>
          </div>
          <VImg class="memory-image" :src="detail.memory.imageUrl" :alt="`Souvenir gagnant de ${detail.country.name}`" cover />
          <p>par @{{ detail.memory.user.username }}</p>
        </section>
      </template>
    </template>
  </section>
</template>

<style scoped>
.country-panel-content { display: flex; min-height: 0; flex-direction: column; gap: 18px; padding: 20px; color: #182C40; }
.panel-heading, .panel-heading h2, .section-heading { display: flex; align-items: center; }
.panel-heading { justify-content: space-between; gap: 10px; }
.panel-heading h2 { gap: 9px; margin: 5px 0 0; font: 600 25px/1.2 Georgia, serif; }
.eyebrow { color: #596B74; font-size: 10px; font-weight: 700; letter-spacing: 1.3px; }
.country-hero { position: relative; display: grid; min-height: 148px; place-items: center; overflow: hidden; border-radius: 12px; background: #FAF3E3; color: #27677C; }
.country-hero :deep(.v-img) { position: absolute; inset: 0; height: 100%; }
.hero-caption { position: absolute; right: 10px; bottom: 10px; padding: 4px 7px; border-radius: 5px; background: #182c40d9; color: #FFFEFA; font-size: 10px; letter-spacing: 1px; }
.country-stats { display: grid; gap: 13px; }
.stat-primary, .stat-secondary > div { display: grid; gap: 2px; }
.stat-primary strong { color: #27677C; font: 600 36px/1 Georgia, serif; }
.stat-primary span, .stat-secondary span { color: #596B74; font-size: 12px; }
.stat-secondary { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; }
.stat-secondary strong { display: flex; align-items: center; gap: 4px; font-size: 18px; }
.section-divider { border-color: #27677c30; }
.section-heading { display: grid; justify-items: start; gap: 5px; }
.section-heading h3 { margin: 0; color: #182C40; font: 600 19px/1.25 Georgia, serif; }
.recent-trips { display: grid; gap: 10px; }
.recent-trip { display: grid; grid-template-columns: 94px minmax(0, 1fr); min-height: 92px; overflow: hidden; border: 1px solid #182c4015; border-radius: 10px; background: #FFFEFA; }
.trip-cover { width: 94px; height: 100%; min-height: 92px; }
.trip-cover-empty { display: grid; place-items: center; background: #FAF3E3; color: #596B74; }
.trip-copy { display: grid; align-content: center; gap: 3px; min-width: 0; padding: 9px 11px; }
.trip-copy strong { overflow: hidden; color: #182C40; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.trip-copy span, .trip-copy p, .community-memory p, .empty-copy { margin: 0; color: #596B74; font-size: 11px; line-height: 1.4; }
.trip-copy .trip-rating { color: #9A6A16; letter-spacing: 1px; }
.trip-copy p { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.community-memory { display: grid; gap: 9px; }
.community-memory .section-heading { display: grid; gap: 8px; }
.memory-image { max-height: 190px; border-radius: 11px; }
.panel-state { display: grid; min-height: 180px; align-content: center; gap: 12px; color: #596B74; }
@media (max-width: 960px) { .country-panel-content { padding: 18px 16px 26px; } }
</style>
