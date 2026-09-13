<script setup lang="ts">
import type { PhotoContest, PhotoContestParticipation } from "~/types/interfaces/photo-contests";
import { getPhotoContest, getContestParticipation, submitContestPhoto, voteForContestPhoto } from "~/services/api/photo-contests";
import { formatDate } from "~/utils/dates";
import CountryFlag from "~/components/tripdex/CountryFlag.vue";

const route = useRoute();
const config = useRuntimeConfig();
const auth = useAuth();
const api = useTripdexApi();
const feed = useCommunityActivity();
const { scope } = usePrivateSession();
const id = String(route.params.id);
const contest = ref<PhotoContest | null>(null);
const participation = ref<PhotoContestParticipation | null>(null);
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const selectedTrip = ref<string | null>(null);
async function loadParticipation(): Promise<void> {
  participation.value = null;
  const version = scope.value.version;
  if (auth.status.value !== "authenticated") return;
  const result = await getContestParticipation(api, id);
  if (version === scope.value.version) participation.value = result;
}
async function refresh(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    contest.value = await getPhotoContest(config.public.apiBase, id);
    await loadParticipation();
  } catch { error.value = "Impossible de charger tous les détails du concours. Réessayez."; }
  finally { loading.value = false; }
}
onMounted(async () => { await auth.initialize(); await refresh(); });
watch(() => scope.value.version, () => { participation.value = null; selectedTrip.value = null; }, { flush: "sync" });
async function mutate(kind: "submit" | "vote", value: string): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    if (kind === "submit") await submitContestPhoto(api, id, value);
    else await voteForContestPhoto(api, id, value);
    feed.invalidate();
    await refresh();
  } catch { error.value = "Participation non confirmée. Le concours est peut-être terminé ; rechargez puis réessayez."; }
  finally { busy.value = false; }
}
</script>
<template>
  <main class="contest-page">
    <NuxtLink to="/" class="back">← Retour à l’atlas</NuxtLink>
    <p v-if="loading" role="status">Ouverture du carnet…</p>
    <div v-if="error" role="alert" class="feedback error">{{ error }} <button @click="refresh()">Réessayer</button></div>
    <template v-if="contest">
      <header><span class="eyebrow">✧ SOUVENIR DE LA SEMAINE</span><h1>Un regard sur {{ contest.country.name }}.</h1>
        <p><CountryFlag :iso2="contest.country.iso2" :name="contest.country.name" /> {{ contest.country.name }} · {{ formatDate(contest.startsAt) }} — {{ formatDate(contest.endsAt) }}</p>
        <p>{{ contest.acceptsEntries ? 'Choisissez le souvenir qui représentera ce pays.' : 'Les participations sont closes ou ne sont pas encore ouvertes.' }}</p>
        <span>{{ contest.totalVotes }} vote{{ contest.totalVotes > 1 ? 's' : '' }} · {{ contest.submissions.length }} souvenir{{ contest.submissions.length > 1 ? 's' : '' }}</span>
      </header>
      <div v-if="auth.status.value !== 'authenticated'" class="participation-note"><NuxtLink :to="{ path: '/login', query: { redirect: route.fullPath } }">Se connecter</NuxtLink> pour voter ou proposer un souvenir.</div>
      <form v-else-if="contest.acceptsEntries && participation && !participation.ownSubmissionId && participation.eligibleTrips.length" class="submission-form" @submit.prevent="selectedTrip && mutate('submit', selectedTrip)">
        <label for="memory-trip">Votre voyage PUBLIC et sa cover</label>
        <select id="memory-trip" v-model="selectedTrip" required><option :value="null" disabled>Choisir un souvenir</option><option v-for="trip in participation.eligibleTrips" :key="trip.id" :value="trip.id">{{ trip.title }}</option></select>
        <VBtn type="submit" color="primary" :loading="busy" :disabled="!selectedTrip">Proposer mon souvenir →</VBtn>
      </form>
      <p v-else-if="participation?.ownSubmissionId" class="participation-note">Votre souvenir fait partie du concours.</p>
      <p v-else-if="auth.status.value === 'authenticated' && contest.acceptsEntries" class="participation-note">Pour proposer une photo, enregistrez un voyage PUBLIC dans ce pays avec une cover.</p>
      <p v-if="!contest.submissions.length" class="empty">Le premier souvenir reste à partager.</p>
      <section class="candidate-grid" aria-label="Photos candidates">
        <article v-for="candidate in contest.submissions" :key="candidate.id" class="candidate" :class="{ winner: candidate.id === contest.winnerSubmissionId }">
          <img v-if="candidate.imageUrl" :src="candidate.imageUrl" :alt="`${candidate.trip.title} — ${candidate.user.username}`" />
          <div v-else class="photo-unavailable">Photo momentanément indisponible</div>
          <div class="candidate-body"><span v-if="candidate.id === contest.winnerSubmissionId" class="winner-label">✧ Souvenir élu par la communauté</span>
            <h2>{{ candidate.trip.title }}</h2><p>Par {{ candidate.user.username }}</p>
            <div class="candidate-actions"><span>{{ candidate.votes }} vote{{ candidate.votes > 1 ? 's' : '' }}</span>
              <VBtn v-if="contest.acceptsEntries && auth.status.value === 'authenticated'" :variant="participation?.votedSubmissionId === candidate.id ? 'flat' : 'outlined'" color="primary" :disabled="busy || participation?.votedSubmissionId === candidate.id" @click="mutate('vote', candidate.id)">{{ participation?.votedSubmissionId === candidate.id ? 'Votre vote ✓' : 'Voter' }}</VBtn></div>
          </div>
        </article>
      </section>
    </template>
  </main>
</template>
<style scoped>
.contest-page { max-width: 1120px; margin: auto; padding: 32px 0 64px; color: rgb(var(--v-theme-ink)); }
.back { color: #27677C; font-size: 13px; text-decoration: none; }
header { padding: 44px 0 32px; } header h1 { font: clamp(32px, 4vw, 52px)/1.1 Georgia, serif; margin: 18px 0; }
header p { display: flex; align-items: center; gap: 8px; line-height: 1.6; } header > span:last-child { font-size: 13px; color: #27677C; }
.participation-note, .submission-form { padding: 20px; background: #FFFEFA; border: 1px solid #E8BA59; border-radius: 10px; margin-bottom: 28px; }
.submission-form { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
select { padding: 10px; border: 1px solid #27677c50; border-radius: 6px; min-width: 200px; }
.candidate-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.candidate { background: #FFFEFA; border: 1px solid #182c4020; border-radius: 14px; overflow: hidden; }
.candidate.winner { border: 2px solid #E8BA59; }
.candidate > img, .photo-unavailable { display: block; width: 100%; aspect-ratio: 1.5; object-fit: cover; background: #FAF3E3; }
.photo-unavailable { display: grid; place-items: center; }
.candidate-body { padding: 20px; } h2 { font: 23px Georgia, serif; margin: 8px 0; } .candidate-body p { font-size: 13px; opacity: .75; }
.candidate-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; }
.winner-label { color: #27677C; font-size: 11px; font-weight: 700; letter-spacing: .6px; }
.empty { padding: 60px 0; text-align: center; font: 24px Georgia, serif; }
@media(max-width: 650px) { .candidate-grid { grid-template-columns: 1fr; } }
</style>
