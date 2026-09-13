import type { TripdexApi } from "~/types/interfaces/api";
import type { CountryMemory, PhotoContest, PhotoContestParticipation } from "~/types/interfaces/photo-contests";

export function getPhotoContest(baseURL: string, id: string): Promise<PhotoContest> {
  return $fetch(`/community/photo-contests/${encodeURIComponent(id)}`, { baseURL, retry: 0 });
}
export function getCountryMemories(baseURL: string): Promise<CountryMemory[]> {
  return $fetch("/community/memories", { baseURL, retry: 0 });
}
export function getContestParticipation(api: TripdexApi, id: string): Promise<PhotoContestParticipation> {
  return api.get(`/community/photo-contests/${encodeURIComponent(id)}/participation`);
}
export function submitContestPhoto(api: TripdexApi, id: string, tripId: string): Promise<void> {
  return api.post(`/community/photo-contests/${encodeURIComponent(id)}/submissions`, { body: { tripId } });
}
export function voteForContestPhoto(api: TripdexApi, id: string, submissionId: string): Promise<void> {
  return api.put(`/community/photo-contests/${encodeURIComponent(id)}/vote`, { body: { submissionId } });
}
