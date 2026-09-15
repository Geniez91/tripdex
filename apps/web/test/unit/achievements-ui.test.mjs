import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { compileScript, parse } from "@vue/compiler-sfc";

const appRoot = new URL("../../app/", import.meta.url);
const readApp = (path) => readFileSync(new URL(path, appRoot), "utf8");
const gallery = readApp("components/progression/AchievementGallery.vue");
const presentationSource = readApp(
  "components/progression/achievementPresentation.ts",
);
const achievementTypes = readApp("types/interfaces/achievements.ts");
const achievementService = readApp("services/api/achievements.ts");
const achievementsComposable = readApp("composables/useAchievements.ts");
const tripForm = readApp("components/TripForm.vue");

function loadPresentationModule() {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(presentationSource, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { module, exports: module.exports, Intl },
  );
  return module.exports;
}

function achievement(overrides = {}) {
  return {
    code: "GLOBE_TROTTER",
    name: "Globe Trotter",
    description: "Explorer 10 pays.",
    category: "EXPLORATION",
    unlocked: false,
    current: 7,
    target: 10,
    community: { percentage: 8.4, rarity: "RARE" },
    ...overrides,
  };
}

test("badge UI centralizes all category and rarity labels", () => {
  const { achievementCategoryLabels, achievementRarityLabels } =
    loadPresentationModule();
  assert.deepEqual(Object.keys(achievementCategoryLabels), [
    "JOURNAL",
    "EXPLORATION",
    "CONTINENTS",
    "REVISITS",
    "TRAVEL_TIME",
    "COMMUNITY",
  ]);
  assert.equal(JSON.stringify(achievementCategoryLabels), JSON.stringify({
    JOURNAL: "Journal",
    EXPLORATION: "Exploration",
    CONTINENTS: "Continents",
    REVISITS: "Revisites",
    TRAVEL_TIME: "Temps de voyage",
    COMMUNITY: "Communauté",
  }));
  assert.equal(JSON.stringify(achievementRarityLabels), JSON.stringify({
    COMMON: "Commun",
    UNCOMMON: "Peu commun",
    RARE: "Rare",
    VERY_RARE: "Très rare",
    LEGENDARY: "Légendaire",
  }));
});

test("badge progress is present only for relevant locked achievements and clamps visually", () => {
  const { progressLabel, visualProgress } = loadPresentationModule();
  assert.equal(progressLabel(achievement()), "7 / 10 pays");
  assert.equal(
    progressLabel(achievement({ code: "PREMIER_PAS", current: 0, target: 1 })),
    null,
  );
  assert.equal(progressLabel(achievement({ unlocked: true })), null);
  assert.equal(
    progressLabel(achievement({ code: "CANT_STAY_AWAY", current: 2, target: 3 })),
    "2 / 3 voyages",
  );
  assert.equal(visualProgress(achievement({ current: 17, target: 10 })), 1);
  assert.equal(visualProgress(achievement({ current: -1, target: 10 })), 0);
});

test("badge presentation keeps all records and stably places unlocked achievements first", () => {
  const { sortAchievementsUnlockedFirst } = loadPresentationModule();
  const catalogue = Array.from({ length: 19 }, (_, index) =>
    achievement({
      code: `BADGE_${index + 1}`,
      unlocked: [1, 4, 8, 13].includes(index),
    }),
  );
  const ordered = sortAchievementsUnlockedFirst(catalogue);

  assert.equal(ordered.length, 19);
  assert.deepEqual(
    ordered.map((item) => item.code),
    ["BADGE_2", "BADGE_5", "BADGE_9", "BADGE_14", ...catalogue
      .filter((item) => !item.unlocked)
      .map((item) => item.code)],
  );
  assert.match(gallery, /sortAchievementsUnlockedFirst\(/);
  assert.match(gallery, /achievement\.category === category/);
});

test("community statistics use a French human label and keep zero distinct from missing data", () => {
  const { communityLabel, communityPercentage } = loadPresentationModule();
  assert.equal(communityPercentage(achievement({ community: { percentage: 8.4, rarity: "RARE" } })), "8,4 %");
  assert.equal(communityLabel(achievement({ community: { percentage: 8.4, rarity: "RARE" } })), "Obtenu par 8,4 % des voyageurs");
  assert.equal(communityLabel(achievement({ community: { percentage: 0, rarity: "LEGENDARY" } })), "Aucun voyageur ne l'a encore débloqué");
  assert.match(gallery, /achievement\.community\.percentage > 0/);
  assert.match(gallery, /v-else>Pas encore de données/);
  assert.match(gallery, /achievement\.community\.rarity === 'LEGENDARY'/);
  assert.doesNotMatch(gallery, /PHOTOGRAPHE_TRIPDEX.*LEGENDARY/);
});

test("gallery renders all backend records in stable category groups with local states", () => {
  const { descriptor, errors } = parse(gallery, { filename: "AchievementGallery" });
  assert.deepEqual(errors, []);
  assert.doesNotThrow(() =>
    compileScript(descriptor, { id: "achievement-gallery", inlineTemplate: true }),
  );
  assert.match(gallery, /categoryOrder: AchievementCategory\[\]/);
  assert.match(gallery, /v-for="group in groups"/);
  assert.match(gallery, /v-for="achievement in group\.achievements"/);
  assert.match(gallery, /achievement\.unlocked/);
  assert.match(gallery, /achievement-progress/);
  assert.match(gallery, /achievement-loading/);
  assert.match(gallery, /achievement-error/);
  assert.match(gallery, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(gallery, /@media \(max-width: 820px\)/);
  assert.match(gallery, /@media \(max-width: 500px\)/);
});

test("achievement visual states keep locked badges neutral and reveal prestige only when unlocked", () => {
  assert.match(gallery, /'is-unlocked': achievement\.unlocked/);
  assert.match(gallery, /'is-locked': !achievement\.unlocked/);
  assert.match(gallery, /\.achievement-card\.is-locked \{ border-color: #abb6b5/);
  assert.match(gallery, /background: linear-gradient\(135deg, #e5e8e5, #f4f5f1 64%\)/);
  assert.match(gallery, /background: linear-gradient\(135deg, var\(--achievement-tint\), color-mix\(in srgb, var\(--achievement-tint\) 72%, white\)\)/);
  assert.match(gallery, /\.is-locked \.achievement-emblem \{ border-color: #778584/);
  assert.match(gallery, /\.is-locked \.achievement-progress :deep\(\.v-progress-linear__determinate\) \{ background: #657675/);
  assert.match(gallery, /\.rarity-very_rare\.is-unlocked::after/);
  assert.match(gallery, /\.rarity-very_rare\.is-unlocked \{ border: 2px solid transparent; background:/);
  assert.match(gallery, /\.rarity-legendary\.is-unlocked \{/);
  assert.match(gallery, /\.rarity-legendary\.is-unlocked \{ border: 2px solid transparent; background:/);
  assert.match(gallery, /\.is-legendary\.is-unlocked::after/);
  assert.match(gallery, /\.rarity-very_rare\.is-locked, \.rarity-legendary\.is-locked \{ border-color: #abb6b5; box-shadow: none/);
  assert.match(gallery, /@media \(prefers-reduced-motion: reduce\)/);
});

test("achievement cards prioritize the emblem, explicit status pill, and readable locked progress", () => {
  assert.match(gallery, /width: 74px; height: 74px/);
  assert.match(gallery, /size="36"/);
  assert.match(gallery, /height="7"/);
  assert.match(gallery, /\.status-unlocked \{ padding: 5px 10px; border: 1px solid #9bcaa4;[^}]*background: #d8f0db/);
  assert.match(gallery, /\.status-locked \{ padding: 4px 9px; border: 1px solid #b9c3c1/);
  assert.ok(
    gallery.indexOf('class="achievement-status status-unlocked"') <
      gallery.indexOf('class="achievement-description"'),
  );
});

test("collector hover reuses the stamp-style CSS constraints without revealing locked rarity", () => {
  assert.match(gallery, /achievement-card-glint/);
  assert.match(gallery, /@media \(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\)/);
  assert.match(gallery, /transform: translateY\(-4px\) scale\(1\.012\)/);
  assert.match(gallery, /\.achievement-card\.is-unlocked:hover \.achievement-card-glint/);
  assert.match(gallery, /\.rarity-very_rare\.is-unlocked:hover \.achievement-card-glint/);
  assert.match(gallery, /\.rarity-legendary\.is-unlocked:hover \.achievement-card-glint/);
  assert.doesNotMatch(gallery, /\.is-locked:hover \.achievement-card-glint/);
  assert.match(gallery, /\.achievement-card, \.achievement-emblem, \.achievement-card-glint \{ transition: none/);
});

test("achievement themes use reusable pastel families and retain continent identities", () => {
  const { achievementTheme } = loadPresentationModule();
  assert.equal(achievementTheme(achievement({ code: "PREMIER_VOYAGE" })).tint, "#BFE3E6");
  assert.equal(achievementTheme(achievement({ code: "PREMIERS_PAS_AFRIQUE" })).accent, "#C5813D");
  assert.equal(achievementTheme(achievement({ code: "PREMIERS_PAS_ASIE" })).accent, "#C87868");
  assert.equal(achievementTheme(achievement({ code: "PREMIERS_PAS_EUROPE" })).accent, "#397F83");
  assert.equal(achievementTheme(achievement({ code: "PREMIERS_PAS_AMERIQUE_NORD" })).accent, "#8B70A8");
  assert.equal(achievementTheme(achievement({ code: "PREMIERS_PAS_OCEANIE" })).accent, "#6E99B2");
  assert.doesNotMatch(gallery, /\.achievement-card\.is-locked\s*\{[^}]*filter:/);
});

test("achievements use the frontend API and share trip invalidation without frontend business rules", () => {
  assert.match(achievementService, /api\.get<PersonalAchievementsResponse>\("\/me\/achievements"\)/);
  assert.match(achievementsComposable, /getPersonalAchievements\(api\)/);
  assert.match(achievementsComposable, /private-achievements-cache/);
  assert.match(tripForm, /const achievements = useAchievements\(\)/);
  assert.match(tripForm, /achievements\.invalidate\(\)/);
  assert.doesNotMatch(presentationSource, /holderCount|eligibleUserCount|unlockedAt/);
  assert.doesNotMatch(achievementTypes, /holderCount|eligibleUserCount|unlockedAt/);
});
