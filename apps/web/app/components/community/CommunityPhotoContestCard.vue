<script setup lang="ts">
import type { PhotoContest } from "~/types/interfaces/photo-contests";
import CountryFlag from "~/components/tripdex/CountryFlag.vue";

const props = defineProps<{ contest: PhotoContest }>();
const auth = useAuth();
const trips = useTrips();
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  timer = setInterval(() => { now.value = Date.now(); }, 60_000);
  if (auth.status.value === "authenticated" && !props.contest.submissions.length) void trips.load();
});
onUnmounted(() => { if (timer) clearInterval(timer); });
const days = computed(() => Math.max(0, Math.ceil((Date.parse(props.contest.endsAt) - now.value) / 86_400_000)));
const open = computed(() => props.contest.status === "OPEN" && days.value > 0);
const hero = computed(() => props.contest.submissions.find(s => s.imageUrl)?.imageUrl);
const eligible = computed(() => auth.status.value === "authenticated" && trips.trips.value.some(trip =>
  trip.visibility === "public" && trip.coverUrl && trip.countries.some(c => c.id === props.contest.country.id)));
</script>
<template>
  <article class="contest-card">
    <div class="contest-kicker"><span>✧ SOUVENIR DE LA SEMAINE</span><span>{{ open ? `Fin dans ${days} jour${days > 1 ? 's' : ''}` : 'Concours terminé' }}</span></div>
    <div class="contest-intro">
      <div><h3>Quel souvenir représentera<br /><em>{{ contest.country.name }}</em> cette semaine ?</h3>
        <p class="contest-country"><CountryFlag :iso2="contest.country.iso2" :name="contest.country.name" /> {{ contest.country.name }}</p></div>
      <p class="contest-description">Partagez et votez pour le souvenir qui représentera le pays cette semaine.</p>
    </div>
    <div class="contest-hero">
      <img v-if="hero" :src="hero" :alt="`Photo candidate — ${contest.country.name}`" loading="lazy" />
      <div v-else class="contest-placeholder"><span aria-hidden="true">✧</span><strong>Un pays. Mille souvenirs.</strong><p>La première carte postale reste à écrire.</p></div>
    </div>
    <div class="contest-footer">
      <NuxtLink :to="`/community/photo-contests/${contest.id}`" class="contest-cta">{{ !contest.submissions.length && eligible && open ? 'Proposer mon souvenir' : 'Voir les photos et voter' }} <span aria-hidden="true">→</span></NuxtLink>
      <span v-if="contest.totalVotes > 0">{{ contest.totalVotes }} vote{{ contest.totalVotes > 1 ? 's' : '' }} déjà exprimé{{ contest.totalVotes > 1 ? 's' : '' }}</span>
      <span v-else>Chaque regard compte.</span>
    </div>
  </article>
</template>
<style scoped>
.contest-card { grid-column: 1 / -1; min-width: 0; padding: 28px; border: 2.5px solid #27677C; border-radius: 18px; background: #FFFEFA; color: #182C40; box-shadow: 0 10px 28px #182c4014, 0 0 24px #e8ba590a; }
.contest-kicker, .contest-footer, .contest-intro { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.contest-kicker { flex-wrap: wrap; gap: 10px 24px; font-size: 11px; letter-spacing: 1.5px; font-weight: 750; color: #27677C; }
.contest-kicker > span:first-child { padding: 8px 10px; border-left: 3px solid #E8BA59; border-radius: 4px; background: #e8ba591f; line-height: 1.5; }
.contest-kicker > span:last-child { letter-spacing: 0; font-weight: 500; }
.contest-intro { margin: 26px 0 20px; padding-bottom: 22px; border-bottom: 2px solid #27677c59; align-items: end; }
h3 { font: 30px/1.2 Georgia, serif; margin: 0; } h3 em { color: #27677C; font-weight: 400; }
.contest-country { display: flex; align-items: center; gap: 8px; margin: 12px 0 0; font-size: 13px; }
.contest-description { max-width: 240px; font-size: 13px; line-height: 1.7; opacity: .75; }
.contest-hero { border-radius: 12px; overflow: hidden; background: #FAF3E3; aspect-ratio: 2.5; }
.contest-hero img { width: 100%; height: 100%; object-fit: cover; }
.contest-placeholder { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background-image: repeating-linear-gradient(0deg, transparent, transparent 29px, #27677c0a 30px), repeating-linear-gradient(90deg, transparent, transparent 29px, #27677c0a 30px); }
.contest-placeholder > span { font-size: 44px; color: #E8BA59; } .contest-placeholder strong { font: 24px Georgia, serif; } .contest-placeholder p { font-size: 12px; }
.contest-footer { margin-top: 22px; padding-top: 20px; border-top: 1px solid #27677c40; font-size: 12px; }
.contest-cta { display: flex; gap: 30px; align-items: center; background: #27677C; color: #FFFEFA; text-decoration: none; padding: 14px 20px; border-radius: 8px; font-size: 13px; font-weight: 650; }
.contest-cta:hover { background: #182C40; }
.contest-cta:focus-visible { outline: 3px solid #E8BA59; outline-offset: 3px; }
@media (max-width: 650px) { .contest-card { padding: 20px 16px; } .contest-intro, .contest-footer { flex-direction: column; align-items: start; gap: 10px; } h3 { font-size: 25px; } .contest-hero { aspect-ratio: 1.7; } .contest-description { max-width: none; } }
</style>
