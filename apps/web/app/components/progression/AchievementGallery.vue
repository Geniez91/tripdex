<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import type {
  AchievementCategory,
  PersonalAchievement,
} from "~/types/interfaces/achievements";
import {
  achievementCategoryLabels,
  achievementEmblem,
  achievementIcon,
  achievementRarityLabels,
  achievementTheme,
  communityLabel,
  communityPercentage,
  progressLabel,
  sortAchievementsUnlockedFirst,
  visualProgress,
} from "./achievementPresentation";

const achievements = useAchievements();
const data = achievements.data;
const loading = achievements.loading;
const error = achievements.error;
const categoryOrder: AchievementCategory[] = [
  "JOURNAL",
  "EXPLORATION",
  "CONTINENTS",
  "REVISITS",
  "TRAVEL_TIME",
  "COMMUNITY",
];
const groups = computed(() =>
  categoryOrder.map((category) => ({
    category,
    label: achievementCategoryLabels[category],
    achievements: sortAchievementsUnlockedFirst(
      (data.value?.achievements ?? []).filter(
        (achievement) => achievement.category === category,
      ),
    ),
  })),
);

onMounted(() => {
  void achievements.load();
});
watch(
  () => achievements.invalidated.value,
  (invalidated) => {
    if (invalidated) void achievements.load();
  },
);

function rarityLabel(achievement: PersonalAchievement): string | null {
  const rarity = achievement.community.rarity;
  return rarity ? achievementRarityLabels[rarity] : null;
}
</script>

<template>
  <section class="achievement-section" aria-labelledby="badges-heading">
    <header class="section-heading badges-heading">
      <div>
        <span class="eyebrow">BADGES</span>
        <h2 id="badges-heading">Les souvenirs qui jalonnent ton atlas</h2>
        <p>Les traces de tes voyages, une aventure après l'autre.</p>
      </div>
    </header>

    <div v-if="loading && !data" class="achievement-loading" aria-busy="true">
      <VSkeletonLoader v-for="slot in 6" :key="slot" type="card" />
    </div>

    <VAlert
      v-else-if="error && !data"
      class="achievement-error"
      type="warning"
      variant="tonal"
      role="alert"
    >
      {{ error }}
      <VBtn variant="text" class="retry-button" @click="achievements.retry()">
        Réessayer
      </VBtn>
    </VAlert>

    <template v-else-if="data">
      <VAlert
        v-if="error"
        class="achievement-error achievement-stale-error"
        type="warning"
        variant="tonal"
        role="status"
      >
        La dernière actualisation des badges a échoué.
        <VBtn variant="text" class="retry-button" @click="achievements.retry()">
          Réessayer
        </VBtn>
      </VAlert>

      <section
        v-for="group in groups"
        :key="group.category"
        class="achievement-group"
        :aria-labelledby="`badge-category-${group.category}`"
      >
        <h3 :id="`badge-category-${group.category}`">{{ group.label }}</h3>
        <div class="achievement-grid">
          <article
            v-for="achievement in group.achievements"
            :key="achievement.code"
            class="achievement-card"
            :class="[
              `rarity-${achievement.community.rarity?.toLocaleLowerCase() ?? 'unknown'}`,
              {
                'is-unlocked': achievement.unlocked,
                'is-locked': !achievement.unlocked,
                'is-legendary': achievement.community.rarity === 'LEGENDARY',
              },
            ]"
            :style="{
              '--achievement-accent': achievementTheme(achievement).accent,
              '--achievement-tint': achievementTheme(achievement).tint,
              '--achievement-ink': achievementTheme(achievement).ink,
            }"
          >
            <div class="achievement-emblem" aria-hidden="true">
              <span class="emblem-ring">
                <VIcon
                  v-if="achievementEmblem(achievement).type === 'mdi'"
                  :icon="achievementIcon(achievement)"
                  size="36"
                />
                <img
                  v-else
                  class="emblem-asset"
                  :src="achievementEmblem(achievement).src"
                  :alt="achievementEmblem(achievement).alt"
                />
              </span>
            </div>
            <div class="achievement-copy">
              <h4>{{ achievement.name }}</h4>
            </div>
            <p v-if="achievement.unlocked" class="achievement-status status-unlocked">
              <VIcon icon="mdi-check-circle" size="17" aria-hidden="true" />
              Débloqué
            </p>
            <template v-else>
              <p class="achievement-status status-locked">
                <VIcon icon="mdi-lock-outline" size="15" aria-hidden="true" />
                À découvrir
              </p>
            </template>
            <div class="achievement-description">
              <p>{{ achievement.description }}</p>
            </div>
            <template v-if="!achievement.unlocked">
              <div v-if="progressLabel(achievement)" class="achievement-progress">
                <span>{{ progressLabel(achievement) }}</span>
                <VProgressLinear
                  :model-value="visualProgress(achievement) * 100"
                  color="transparent"
                  bg-color="transparent"
                  height="7"
                  rounded
                  aria-hidden="true"
                />
              </div>
            </template>
            <div class="achievement-community">
              <template v-if="achievement.community.rarity">
                <strong class="rarity-chip">{{ rarityLabel(achievement) }}</strong>
                <span v-if="achievement.community.percentage > 0" class="community-stat">
                  Obtenu par <strong class="community-percentage">{{ communityPercentage(achievement) }}</strong> des voyageurs
                </span>
                <span v-else class="community-stat">{{ communityLabel(achievement) }}</span>
              </template>
              <span v-else>Pas encore de données</span>
            </div>
            <span class="achievement-card-glint" aria-hidden="true" />
          </article>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.achievement-section {
  padding: 24px 20px;
  border: 1px solid rgba(var(--v-theme-ink), 0.08);
  border-radius: var(--tripdex-radius-lg);
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 24px rgba(var(--v-theme-ink), 0.045);
}
.badges-heading { position: relative; margin-bottom: 22px; overflow: hidden; }
.badges-heading::after { position: absolute; top: 3px; right: 2px; width: 76px; height: 76px; border: 1px dashed rgba(var(--v-theme-primary), 0.24); border-radius: 50%; content: ""; }
.badges-heading::before { position: absolute; top: 40px; right: 25px; width: 34px; border-top: 2px dotted rgba(var(--v-theme-sun), 0.8); transform: rotate(-24deg); content: ""; }
.badges-heading p { max-width: 480px; margin-top: 8px; color: rgb(var(--v-theme-muted)); font-size: 13px; line-height: 1.55; }
.achievement-loading, .achievement-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.achievement-loading :deep(.v-skeleton-loader) { min-height: 168px; border-radius: 18px; background: rgb(var(--v-theme-ocean)); }
.achievement-group + .achievement-group { margin-top: 25px; }
.achievement-group h3 { margin: 0 0 11px; color: rgb(var(--v-theme-muted)); font-size: 11px; font-weight: 750; letter-spacing: 1.15px; text-transform: uppercase; }
.achievement-card { position: relative; display: grid; grid-template-columns: 78px minmax(0, 1fr); align-content: start; gap: 7px 14px; min-width: 0; min-height: 174px; padding: 15px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--achievement-accent) 56%, white); border-radius: 18px; background: linear-gradient(135deg, var(--achievement-tint), color-mix(in srgb, var(--achievement-tint) 72%, white)); transition: transform 280ms ease, box-shadow 280ms ease, border-color 280ms ease; }
.achievement-card > * { position: relative; z-index: 1; }
.achievement-card::before { position: absolute; right: -27px; bottom: -38px; width: 112px; height: 112px; border: 1px dashed color-mix(in srgb, var(--achievement-accent) 24%, transparent); border-radius: 50%; content: ""; }
.achievement-card::after { position: absolute; inset: 0; pointer-events: none; border-radius: inherit; content: ""; }
.achievement-card-glint { position: absolute !important; z-index: 0 !important; inset: -40% -80%; pointer-events: none; background: linear-gradient(115deg, transparent 38%, rgba(255, 255, 255, 0.2) 45%, rgba(255, 255, 255, 0.7) 50%, rgba(255, 255, 255, 0.2) 55%, transparent 62%); transform: translateX(-65%); opacity: 0; transition: transform 700ms ease, opacity 240ms ease; }
.achievement-card.is-unlocked { border-color: color-mix(in srgb, var(--achievement-accent) 52%, white); box-shadow: 0 7px 17px color-mix(in srgb, var(--achievement-accent) 12%, transparent); }
.achievement-card.is-locked { border-color: #abb6b5; background: linear-gradient(135deg, #e5e8e5, #f4f5f1 64%); box-shadow: none; }
.achievement-card.is-locked::before { border-color: rgba(91, 108, 108, 0.24); }
.achievement-emblem { position: relative; display: grid; width: 74px; height: 74px; place-items: center; border: 2px solid color-mix(in srgb, var(--achievement-accent) 88%, white); border-radius: 50%; color: var(--achievement-ink); background: color-mix(in srgb, var(--achievement-tint) 38%, white); box-shadow: inset 0 0 0 4px rgb(var(--v-theme-surface)), inset 0 0 0 6px color-mix(in srgb, var(--achievement-accent) 66%, transparent); transition: transform 280ms ease, box-shadow 280ms ease; }
.achievement-emblem::after { position: absolute; inset: -5px; border: 1px dashed color-mix(in srgb, var(--achievement-accent) 56%, transparent); border-radius: 48% 52% 50% 47%; transform: rotate(-12deg); content: ""; }
.emblem-ring { display: grid; width: 48px; height: 48px; place-items: center; border: 2px solid color-mix(in srgb, var(--achievement-accent) 66%, transparent); border-radius: 50%; }
.emblem-asset { width: 36px; height: 36px; object-fit: contain; }
.is-locked .achievement-emblem { border-color: #778584; color: #4e5e5d; background: #f8f9f6; box-shadow: inset 0 0 0 4px #fffefa, inset 0 0 0 6px #aeb9b7; }
.is-locked .achievement-emblem::after { border-color: #8f9b9a; }
.is-locked .emblem-ring { border-color: #7d8b89; }
.is-locked .emblem-asset { filter: grayscale(1); }
.is-locked .achievement-copy h4 { color: #536362; }
.is-locked .achievement-copy p, .is-locked .achievement-community { color: #71807f; }
.achievement-copy h4 { margin: 1px 0 3px; color: rgb(var(--v-theme-ink)); font: 600 18px / 1.18 Georgia, serif; }
.achievement-description { grid-column: 2; }
.achievement-description p { color: rgb(var(--v-theme-muted)); font-size: 14px; line-height: 1.38; }
.achievement-progress, .achievement-community { grid-column: 1 / -1; }
.achievement-status { display: inline-flex; grid-column: 2; align-items: center; width: fit-content; gap: 5px; margin: 0; font-size: 12px; font-weight: 800; letter-spacing: 0.1px; }
.status-unlocked { padding: 5px 10px; border: 1px solid #9bcaa4; border-radius: 999px; color: #27633d; background: #d8f0db; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7); }
.status-locked { padding: 4px 9px; border: 1px solid #b9c3c1; border-radius: 999px; color: #52615f; background: #e1e6e3; }
.achievement-progress { display: grid; gap: 5px; color: rgb(var(--v-theme-muted)); font-size: 12px; font-variant-numeric: tabular-nums; }
.achievement-progress :deep(.v-progress-linear) { border: 1px solid color-mix(in srgb, var(--achievement-accent) 16%, transparent); background: color-mix(in srgb, var(--achievement-tint) 72%, white) !important; }
.achievement-progress :deep(.v-progress-linear__determinate) { background: var(--achievement-accent) !important; }
.is-locked .achievement-progress { color: #526361; font-weight: 750; }
.is-locked .achievement-progress :deep(.v-progress-linear) { border-color: #d0d6d4; background: #e4e8e5 !important; }
.is-locked .achievement-progress :deep(.v-progress-linear__determinate) { background: #657675 !important; }
.achievement-community { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; align-self: end; padding-top: 8px; border-top: 1px solid color-mix(in srgb, var(--achievement-accent) 14%, transparent); color: rgb(var(--v-theme-muted)); font-size: 12px; line-height: 1.35; }
.is-locked .achievement-community { border-top-color: #d0d6d4; }
.rarity-chip { display: inline-flex; padding: 4px 8px; border: 1px solid color-mix(in srgb, var(--achievement-accent) 28%, white); border-radius: 999px; color: var(--achievement-ink); background: color-mix(in srgb, var(--achievement-tint) 82%, white); font-size: 11px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; }
.community-percentage { color: var(--achievement-ink); font-size: 13px; font-weight: 800; }
.rarity-very_rare.is-unlocked .community-percentage { color: var(--achievement-accent); }
.rarity-legendary.is-unlocked .community-percentage { color: #9a6810; }
.is-locked .community-percentage { color: #526361; }
.is-locked .rarity-chip { border-color: #ccd3d1; color: #697675; background: #f0f2ef; box-shadow: none; opacity: 1; }
.rarity-common .rarity-chip { opacity: 0.72; }
.rarity-uncommon .rarity-chip { border-color: color-mix(in srgb, var(--achievement-accent) 42%, white); }
.rarity-rare .rarity-chip { border-color: var(--achievement-accent); }
.rarity-rare.is-unlocked { border-color: color-mix(in srgb, var(--achievement-accent) 70%, white); box-shadow: 0 5px 16px color-mix(in srgb, var(--achievement-accent) 10%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.72); }
.rarity-very_rare.is-unlocked { border: 2px solid transparent; background: linear-gradient(135deg, var(--achievement-tint), color-mix(in srgb, var(--achievement-tint) 72%, white)) padding-box, linear-gradient(118deg, var(--achievement-accent), rgba(255, 255, 255, 0.94), var(--achievement-accent)) border-box; box-shadow: 0 0 0 2px color-mix(in srgb, var(--achievement-accent) 14%, transparent), 0 9px 22px color-mix(in srgb, var(--achievement-accent) 18%, transparent); }
.rarity-very_rare.is-unlocked::after { background: linear-gradient(118deg, transparent 35%, color-mix(in srgb, var(--achievement-tint) 34%, white) 47%, rgba(255, 255, 255, 0.72) 51%, transparent 63%); transform: translateX(-112%); animation: rarity-shimmer 6.2s ease-in-out infinite; }
.rarity-very_rare.is-unlocked .achievement-emblem { box-shadow: inset 0 0 0 4px rgb(var(--v-theme-surface)), inset 0 0 0 6px color-mix(in srgb, var(--achievement-accent) 54%, transparent), 0 0 15px color-mix(in srgb, var(--achievement-accent) 26%, transparent); }
.rarity-very_rare .rarity-chip { border-color: var(--achievement-accent); box-shadow: 0 2px 7px color-mix(in srgb, var(--achievement-accent) 16%, transparent); }
.rarity-legendary.is-unlocked { border: 2px solid transparent; background: linear-gradient(135deg, var(--achievement-tint), color-mix(in srgb, var(--achievement-tint) 72%, white)) padding-box, linear-gradient(118deg, #c98d20, #fff1bd, rgb(var(--v-theme-sun)), #fff7d9, #c98d20) border-box; box-shadow: 0 0 0 2px rgba(var(--v-theme-sun), 0.2), 0 11px 27px rgba(var(--v-theme-sun), 0.24); }
.rarity-legendary.is-unlocked .achievement-emblem { border-color: rgb(var(--v-theme-sun)); box-shadow: inset 0 0 0 4px rgb(var(--v-theme-surface)), inset 0 0 0 6px rgba(var(--v-theme-sun), 0.55), inset 0 0 0 9px rgba(var(--v-theme-sun), 0.18), 0 0 19px rgba(var(--v-theme-sun), 0.28); }
.rarity-legendary .rarity-chip { border-color: rgb(var(--v-theme-sun)); color: #76500c; background: #faedca; }
.is-legendary.is-unlocked::after { background: linear-gradient(112deg, transparent 29%, rgba(255, 250, 226, 0.16) 40%, rgba(255, 246, 203, 0.82) 50%, rgba(255, 250, 226, 0.16) 60%, transparent 71%); transform: translateX(-115%); animation: legendary-shimmer 4.8s ease-in-out infinite; }
.rarity-very_rare.is-locked, .rarity-legendary.is-locked { border-color: #abb6b5; box-shadow: none; }
.achievement-card.is-locked .rarity-chip { border-color: #ccd3d1; color: #697675; background: #f0f2ef; box-shadow: none; opacity: 1; }
.is-locked .status-locked { color: #627170; }
.achievement-error { margin: 0; }
.achievement-stale-error { margin-bottom: 16px; }
.retry-button { margin-left: 5px; }
@keyframes legendary-shimmer { 0%, 58% { transform: translateX(-115%); } 78%, 100% { transform: translateX(115%); } }
@keyframes rarity-shimmer { 0%, 55% { transform: translateX(-112%); } 76%, 100% { transform: translateX(112%); } }
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .achievement-card:hover { transform: translateY(-4px) scale(1.012); box-shadow: 0 12px 25px rgba(var(--v-theme-ink), 0.14); }
  .achievement-card:hover .achievement-emblem { transform: scale(1.05); }
  .achievement-card.is-unlocked:hover { border-color: var(--achievement-accent); }
  .achievement-card.is-unlocked:hover .achievement-card-glint { transform: translateX(65%); opacity: 0.14; }
  .rarity-rare.is-unlocked:hover .achievement-card-glint { opacity: 0.23; }
  .rarity-very_rare.is-unlocked:hover .achievement-card-glint { opacity: 0.34; }
  .rarity-very_rare.is-unlocked:hover .achievement-emblem { box-shadow: inset 0 0 0 4px rgb(var(--v-theme-surface)), inset 0 0 0 6px color-mix(in srgb, var(--achievement-accent) 62%, transparent), 0 0 20px color-mix(in srgb, var(--achievement-accent) 34%, transparent); }
  .rarity-legendary.is-unlocked:hover .achievement-card-glint { opacity: 0.48; }
  .rarity-legendary.is-unlocked:hover .achievement-emblem { box-shadow: inset 0 0 0 4px rgb(var(--v-theme-surface)), inset 0 0 0 6px rgba(var(--v-theme-sun), 0.7), inset 0 0 0 9px rgba(var(--v-theme-sun), 0.24), 0 0 24px rgba(var(--v-theme-sun), 0.36); }
  .is-locked:hover .achievement-emblem { border-color: #647270; box-shadow: inset 0 0 0 4px #fffefa, inset 0 0 0 6px #97a4a2; }
}
@media (prefers-reduced-motion: reduce) { .achievement-card, .achievement-emblem, .achievement-card-glint { transition: none; } .is-legendary::after, .rarity-very_rare::after { animation: none; transform: none; background: linear-gradient(112deg, transparent 42%, rgba(255, 254, 250, 0.2) 50%, transparent 58%); } }
@media (max-width: 820px) { .achievement-loading, .achievement-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 500px) { .achievement-section { padding: 20px 14px; } .achievement-loading, .achievement-grid { grid-template-columns: minmax(0, 1fr); } .achievement-card { min-height: 164px; grid-template-columns: 68px minmax(0, 1fr); } .achievement-emblem { width: 64px; height: 64px; } .emblem-ring { width: 42px; height: 42px; } .achievement-description, .achievement-status { grid-column: 2; } }
</style>
