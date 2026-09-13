import type { CommunityActivity, PhotoContestCommunityActivity } from "~/types/interfaces/community";

export function communityActivityKey(activity: CommunityActivity): string {
  return activity.type === "TRIP_LOGGED" ? `trip:${activity.trip.id}` : `contest:${activity.contest.id}`;
}

// Presentation only: leave the cached chronology and API cursor untouched.
export function presentCommunityActivity(activities: CommunityActivity[], now: number, openContest: PhotoContestCommunityActivity | null = null) {
  const candidates = openContest ? [openContest, ...activities] : activities;
  const featured = candidates.find((activity): activity is PhotoContestCommunityActivity =>
    activity.type === "PHOTO_CONTEST_OPENED" && activity.contest.status === "OPEN" &&
    Date.parse(activity.contest.startsAt) <= now && now < Date.parse(activity.contest.endsAt),
  ) ?? null;
  return {
    featured,
    recent: featured
      ? activities.filter(activity => communityActivityKey(activity) !== communityActivityKey(featured))
      : activities,
  };
}
