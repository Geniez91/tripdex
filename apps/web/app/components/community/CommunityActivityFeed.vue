<script setup lang="ts">
import { communityActivityKey, presentCommunityActivity } from "~/services/communityActivity";
import CommunityActivityItem from "./CommunityActivityItem.vue";

const {
  activities,
  openContest,
  nextCursor,
  hasLoaded,
  loading,
  error,
  loadMore,
  retry,
  refresh,
} = useCommunityActivity();
const now = ref(Date.now());
const presentation = computed(() => presentCommunityActivity(activities.value, now.value, openContest.value));
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleExpiry() {
  const endsAt = presentation.value.featured?.contest.endsAt;
  if (expiryTimer) clearTimeout(expiryTimer);
  if (endsAt) expiryTimer = setTimeout(() => { now.value = Date.now(); }, Math.max(0, Date.parse(endsAt) - Date.now()));
}
watch(() => presentation.value.featured?.contest.endsAt, scheduleExpiry);
function refreshVisibleFeed() {
  now.value = Date.now();
  if (document.visibilityState === "visible") void refresh();
}
onMounted(() => {
  now.value = Date.now();
  scheduleExpiry();
  void refresh();
  document.addEventListener("visibilitychange", refreshVisibleFeed);
});
onUnmounted(() => {
  if (expiryTimer) clearTimeout(expiryTimer);
  document.removeEventListener("visibilitychange", refreshVisibleFeed);
});
</script>

<template>
  <section class="activity-feed" aria-labelledby="activity-feed-title">
    <div class="feed-heading">
      <div>
        <span class="eyebrow">LE CARNET COMMUN</span>
        <h2 id="activity-feed-title">{{ presentation.featured ? "Carnet commun" : "Activité récente" }}</h2>
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
    <div v-else-if="!activities.length && !presentation.featured" class="feed-empty" role="status">
      Aucun voyage public pour le moment. Le prochain récit peut commencer ici.
    </div>
    <template v-else>
      <CommunityActivityItem
        v-if="presentation.featured"
        :key="communityActivityKey(presentation.featured)"
        :activity="presentation.featured"
      />
      <h3 v-if="presentation.featured" class="recent-divider">Activités récentes</h3>
      <div class="feed-list">
        <CommunityActivityItem
          v-for="activity in presentation.recent"
          :key="communityActivityKey(activity)"
          :activity="activity"
        />
      </div>
    </template>
    <VBtn
      v-if="nextCursor"
      variant="outlined"
      color="primary"
      :loading="loading"
      prepend-icon="mdi-book-arrow-down-outline"
      @click="loadMore"
    >
      Voir les activités suivantes
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
.feed-heading {
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
.recent-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 28px 0 22px;
  color: #27677C;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.8px;
  text-transform: uppercase;
}
.recent-divider::after {
  content: "";
  flex: 1;
  border-top: 1px solid #27677c40;
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
}
</style>
