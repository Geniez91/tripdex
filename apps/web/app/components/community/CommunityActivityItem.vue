<script setup lang="ts">
import type { CommunityActivity } from "~/types/interfaces/community";
import CommunityTripCard from "./CommunityTripCard.vue";
import CommunityPhotoContestCard from "./CommunityPhotoContestCard.vue";
defineProps<{ activity: CommunityActivity }>();
</script>
<template>
  <CommunityTripCard v-if="activity.type === 'TRIP_LOGGED'" :activity="activity" />
  <CommunityPhotoContestCard v-else-if="activity.type === 'PHOTO_CONTEST_OPENED'" :contest="activity.contest" />
</template>
