<script setup lang="ts">
import { formatDate } from "~/utils/dates";
import type { CommunityCountryStatistics } from "~/types/interfaces/community";
import CountryFlag from "~/components/tripdex/CountryFlag.vue";
defineProps<{
  country: CommunityCountryStatistics | null;
  year: number;
  asOfDate: string | null;
  loading: boolean;
  failed: boolean;
  hasSelection: boolean;
}>();
</script>
<template>
  <section
    class="community-country-panel"
    aria-label="Détails du pays sélectionné"
    aria-live="polite"
    :aria-busy="loading"
  >
    <p v-if="loading" class="panel-placeholder" role="status">
      Actualisation des voyages de la communauté…
    </p>
    <p v-else-if="failed" class="panel-placeholder">
      Les données du pays seront disponibles après le rechargement des
      statistiques.
    </p>
    <template v-else-if="country">
      <header class="country-heading">
        <CountryFlag
          :iso2="country.country.iso2"
          :name="country.country.name"
        />
        <h3>{{ country.country.name }}</h3>
        <span v-if="country.trending" class="trending-label"
          ><VIcon
            icon="mdi-white-balance-sunny"
            size="15"
            aria-hidden="true"
          />Tendance</span
        >
      </header>
      <div class="country-content">
        <div class="country-numbers">
          <p class="annual-travelers">
            <strong>{{ country.travelers }}</strong>
            {{ country.travelers === 1 ? "voyageur" : "voyageurs" }} en
            {{ year }}
          </p>
          <p v-if="country.travelersNow > 0" class="travelers-now">
            <span aria-hidden="true">●</span> {{ country.travelersNow }} en
            voyage actuellement
          </p>
          <p v-if="asOfDate" class="current-date">
            Présence au {{ formatDate(asOfDate) }} (UTC), indépendante de
            l’année sélectionnée.
          </p>
        </div>
        <div class="country-origins">
          <h4>Principales origines</h4>
          <ul v-if="country.topOrigins.length">
            <li v-for="origin in country.topOrigins" :key="origin.country.id">
              <CountryFlag
                :iso2="origin.country.iso2"
                :name="origin.country.name"
              /><span>{{ origin.country.name }}</span
              ><strong
                >{{ origin.travelers }}
                <span class="sr-only">voyageurs</span></strong
              >
            </li>
          </ul>
          <p v-else class="no-origins">
            Aucune origine renseignée pour cette destination en {{ year }}.
          </p>
        </div>
      </div>
    </template>
    <div v-else class="panel-placeholder">
      <VIcon icon="mdi-compass-outline" size="28" aria-hidden="true" />
      <h3>
        {{
          hasSelection
            ? "Statistiques indisponibles pour ce pays"
            : "Une destination, des voyageurs venus d’ailleurs."
        }}
      </h3>
      <p>
        {{
          hasSelection
            ? "Ce territoire ne dispose pas de statistiques dans le référentiel."
            : "Sélectionnez un pays sur la carte ou dans la recherche pour découvrir ses voyageurs et leurs pays de résidence."
        }}
      </p>
    </div>
  </section>
</template>
<style scoped>
.community-country-panel {
  margin: 4px 28px 22px;
  padding: 24px;
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 16px;
  background: rgba(var(--v-theme-ocean), 0.28);
}
.country-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.country-heading h3 {
  font-size: 24px;
  letter-spacing: -0.5px;
}
.trending-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 20px;
  background: rgba(var(--v-theme-sun), 0.25);
  color: rgb(var(--v-theme-ink));
  font-size: 12px;
}
.country-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
}
.annual-travelers strong {
  font-size: 36px;
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  margin-right: 6px;
}
.travelers-now {
  margin-top: 10px;
  font-size: 14px;
}
.travelers-now span {
  color: rgb(var(--v-theme-primary));
  margin-right: 4px;
}
.current-date {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: rgb(var(--v-theme-muted));
  max-width: 330px;
}
h4 {
  font-size: 13px;
  margin-bottom: 12px;
}
ul {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 10px;
}
li {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 14px;
}
li strong {
  margin-left: auto;
  color: rgb(var(--v-theme-primary));
}
.no-origins {
  font-size: 14px;
  color: rgb(var(--v-theme-muted));
  line-height: 1.6;
}
.panel-placeholder {
  display: grid;
  gap: 10px;
  max-width: 650px;
  color: rgb(var(--v-theme-muted));
  line-height: 1.6;
}
.panel-placeholder h3 {
  font-size: 18px;
  color: rgb(var(--v-theme-ink));
}
@media (max-width: 600px) {
  .community-country-panel {
    margin: 4px 12px 18px;
    padding: 20px 16px;
  }
  .country-content {
    grid-template-columns: 1fr;
    gap: 22px;
  }
}
</style>
