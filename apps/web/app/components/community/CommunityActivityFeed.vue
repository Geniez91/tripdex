<script setup lang="ts">
import { formatDate, formatTripPeriod } from "~/utils/dates";
import CountryFlag from "~/components/tripdex/CountryFlag.vue";

const {
  activities, nextCursor, hasLoaded, loading, error,
  load, loadMore, retry,
} = useCommunityActivity();
onMounted(() => load());
</script>

<template>
  <section class="activity-feed" aria-labelledby="activity-feed-title">
    <div class="feed-heading">
      <div>
        <span class="eyebrow">LE CARNET COMMUN</span>
        <h2 id="activity-feed-title">Activité récente</h2>
        <p>Les voyages que la communauté choisit de partager.</p>
      </div>
      <VIcon
        icon="mdi-book-open-page-variant-outline"
        size="32"
        color="primary"
      />
    </div>
    <div v-if="error" class="feedback error" role="alert">
      Impossible de charger l’activité communautaire.
      <button class="text-button" @click="retry()">Réessayer</button>
    </div>
    <div v-else-if="!hasLoaded" class="feed-loading" role="status">
      Le carnet commun s’ouvre…
    </div>
    <div v-else-if="!activities.length" class="feed-empty" role="status">
      Aucun voyage public pour le moment. Le prochain récit peut commencer ici.
    </div>
    <div v-else class="feed-list">
      <article
        v-for="activity in activities"
        :key="activity.trip.id"
        class="activity-card"
      >
        <div class="activity-author">
          <VAvatar color="primary" size="34">
            <VImg
              v-if="activity.user.avatarUrl"
              :src="activity.user.avatarUrl"
              alt=""
            />
            <span v-else>{{
              activity.user.username.slice(0, 1).toUpperCase()
            }}</span>
          </VAvatar>
          <div>
            <strong>{{ activity.user.username }}</strong>
            <span>a enregistré un voyage</span>
          </div>
          <time :datetime="activity.activityDate">{{
            formatDate(activity.activityDate)
          }}</time>
        </div>
        <div class="activity-destination">
          <div class="destination-title">
            <CountryFlag
              :iso2="activity.trip.countries[0]?.iso2"
              :name="activity.trip.countries[0]?.name"
            />
            <h3>{{ activity.trip.title }}</h3>
          </div>
          <p>
            {{
              activity.trip.countries.map((country) => country.name).join(" · ")
            }}
          </p>
          <p v-if="activity.trip.cities.length" class="activity-cities">
            {{ activity.trip.cities.map((city) => city.name).join(" · ") }}
          </p>
        </div>
        <img
          v-if="activity.trip.coverUrl"
          class="activity-cover"
          :src="activity.trip.coverUrl"
          :alt="`Cover de ${activity.trip.title}`"
          loading="lazy"
        />
        <div class="activity-meta">
          <span v-if="activity.trip.rating">{{
            "★".repeat(activity.trip.rating)
          }}</span>
          <span v-if="activity.trip.durationDays"
            >{{ activity.trip.durationDays }} jours</span
          >
          <span>{{
            formatTripPeriod(activity.trip.startDate, activity.trip.endDate)
          }}</span>
        </div>
        <p v-if="activity.trip.review" class="activity-review">
          « {{ activity.trip.review }} »
        </p>
      </article>
    </div>
    <VBtn
      v-if="nextCursor"
      variant="outlined"
      color="primary"
      :loading="loading"
      prepend-icon="mdi-book-arrow-down-outline"
      @click="loadMore"
    >
      Voir les voyages suivants
    </VBtn>
  </section>
</template>

<style scoped>
.activity-feed {
  margin-top: 40px;
  padding: 28px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: var(--tripdex-radius-lg);
}
.feed-heading,
.activity-author,
.destination-title,
.activity-meta {
  display: flex;
  align-items: center;
}
.feed-heading {
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}
.feed-heading h2 {
  margin: 8px 0;
  color: rgb(var(--v-theme-ink));
}
.feed-heading p,
.activity-author span,
.activity-destination p,
.activity-meta,
.feed-empty,
.feed-loading {
  color: rgb(var(--v-theme-muted));
}
.feed-heading p {
  margin: 0;
  font-size: 14px;
}
.feed-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.activity-card {
  overflow: hidden;
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 8px;
  background: rgb(var(--v-theme-background));
}
.activity-author {
  gap: 10px;
  padding: 16px 16px 12px;
}
.activity-author div {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.activity-author span,
.activity-author time {
  font-size: 12px;
}
.activity-author time {
  margin-left: auto;
  color: rgb(var(--v-theme-muted));
}
.activity-destination {
  padding: 10px 16px 16px;
}
.destination-title {
  gap: 9px;
}
.destination-title h3 {
  margin: 0;
  color: rgb(var(--v-theme-ink));
}
.activity-destination p {
  margin: 8px 0 0;
}
.activity-cities {
  font-size: 13px;
}
.activity-cover {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 8;
  object-fit: cover;
}
.activity-meta {
  flex-wrap: wrap;
  gap: 8px 14px;
  padding: 14px 16px 0;
  font-size: 12px;
}
.activity-meta span:first-child {
  color: rgb(var(--v-theme-sun));
}
.activity-review {
  margin: 12px 16px 16px;
  line-height: 1.5;
  color: rgb(var(--v-theme-ink));
}
.activity-feed > .v-btn {
  margin-top: 20px;
}
@media (max-width: 700px) {
  .activity-feed {
    padding: 20px 16px;
  }
  .feed-list {
    grid-template-columns: 1fr;
  }
  .activity-author time {
    align-self: flex-start;
  }
}
</style>
