<script setup lang="ts">
import type { TripCommunityActivity } from "~/types/interfaces/community";
import { formatDate, formatTripPeriod } from "~/utils/dates";
import CountryFlag from "~/components/tripdex/CountryFlag.vue";
defineProps<{ activity: TripCommunityActivity }>();
</script>
<template>
  <article class="activity-card">
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
          v-if="activity.trip.countries.length === 1"
          :iso2="activity.trip.countries[0]?.iso2"
          :name="activity.trip.countries[0]?.name"
        />
        <VIcon v-else icon="mdi-earth" aria-hidden="true" />
        <h3>{{ activity.trip.title }}</h3>
      </div>
      <p>
        {{ activity.trip.countries.map((country) => country.name).join(" · ") }}
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
</template>
<style scoped>
.activity-author,
.destination-title,
.activity-meta {
  display: flex;
  align-items: center;
}
.activity-author span,
.activity-destination p,
.activity-meta {
  color: rgb(var(--v-theme-muted));
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

@media (max-width: 700px) {
  .activity-author time {
    align-self: flex-start;
  }
}
</style>
