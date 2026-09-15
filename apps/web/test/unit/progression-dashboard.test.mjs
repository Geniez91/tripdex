import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as Vue from "vue";
import { parse, compileScript } from "@vue/compiler-sfc";

const appRoot = new URL("../../app/", import.meta.url);
const readApp = (path) => readFileSync(new URL(path, appRoot), "utf8");
const dashboard = readApp("components/progression/ProgressionDashboard.vue");
const worldDonut = readApp("components/progression/WorldProgressDoughnut.vue");
const continentDonut = readApp(
  "components/progression/ContinentProgressDoughnut.vue",
);
const countriesChart = readApp(
  "components/progression/CountriesTimelineChart.vue",
);
const daysChart = readApp("components/progression/TravelDaysChart.vue");
const progressionType = readApp("types/interfaces/progression.ts");

function loadPresentationModule(file) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(readApp(`components/progression/${file}.ts`), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { module, exports: module.exports },
  );
  return module.exports;
}

test("all seven continent identities use the supplied static assets and distinct pastel colors", () => {
  const { continentVisuals } = loadPresentationModule("continentVisuals");
  const filenames = {
    AF: "afrique.svg",
    AS: "asie.svg",
    EU: "europe.svg",
    NA: "amerique_du_nord.svg",
    SA: "amerique_du_sud.svg",
    OC: "oceanie.svg",
    AN: "antarctique.jpg",
  };
  assert.equal(Object.keys(continentVisuals).length, 7);
  assert.equal(
    new Set(Object.values(continentVisuals).map((visual) => visual.color)).size,
    7,
  );
  for (const [code, filename] of Object.entries(filenames)) {
    assert.equal(continentVisuals[code].asset, `/continents/${filename}`);
    assert.match(continentVisuals[code].color, /^#[0-9A-F]{6}$/);
    assert.ok(
      readFileSync(
        new URL(`../../public/continents/${filename}`, import.meta.url),
      ).length > 0,
    );
  }
  assert.match(continentDonut, /:color="visual\?\.color"/);
  assert.match(continentDonut, /alt=""/);
  assert.match(continentDonut, /object-fit: contain/);
  assert.doesNotMatch(continentDonut, /<VCard|disabled|filter:/);
  assert.match(dashboard, /:visited-countries="continent\.visitedCountries"/);
  assert.match(dashboard, /:percentage="continent\.completionPercentage"/);
});

test("world keeps its sea-blue default, dynamic center counts and no remaining-country message", () => {
  const donut = readApp("components/progression/ProgressDonut.vue");
  compileComponent(donut, "ProgressDonut");
  assert.match(donut, /props\.color \?\? theme.current.value.colors.primary/);
  assert.doesNotMatch(worldDonut, /:color=|continentVisuals|\b249\b/);
  assert.match(
    worldDonut,
    /number.format\(visitedCountries\).*number.format\(totalCountries\)/,
  );
  assert.doesNotMatch(worldDonut + dashboard, /Encore.*pays à découvrir/);
  assert.match(worldDonut, /:size="232"/);
});

test("world encouragement is static and separate from progression data", () => {
  const { descriptor } = parse(worldDonut);
  const card = descriptor.template.ast.children.find((node) => node.tag === "VCard");
  const content = card.children.find((node) => node.tag === "VCardText");
  const elements = content.children.filter((node) => node.type === 1);
  const message = elements.at(-1);
  assert.equal(elements.at(-2).tag, "ProgressDonut");
  assert.equal(message.tag, "p");
  assert.ok(message.props.every((prop) => prop.type === 6));
  assert.equal(message.children.length, 1);
  assert.equal(message.children[0].type, 2);
  assert.equal(message.children[0].content, "Chaque voyage agrandit ton monde.");
});

test("continent collection uses centered responsive rows and contained silhouettes", () => {
  assert.match(dashboard, /container-type: inline-size/);
  for (const columns of [4, 6, 8]) {
    assert.ok(dashboard.includes(`grid-template-columns: repeat(${columns}, minmax(0, 1fr))`));
  }
  assert.match(dashboard, /\.continent-grid > div:nth-child\(5\)\s*\{\s*grid-column: 2 \/ span 2/);
  assert.match(continentDonut, /grid-template-rows:/);
  assert.match(continentDonut, /object-fit: contain/);
  assert.match(continentDonut, /\{\{ visitedCountries \}\} \/ \{\{ totalCountries \}\}/);
  assert.match(continentDonut, /:percentage="percentage"/);
  const { continentVisuals } = loadPresentationModule("continentVisuals");
  assert.deepEqual(Object.keys(continentVisuals), ["AF", "AS", "EU", "NA", "SA", "OC", "AN"]);
});

test("achievement gallery follows world completion and continents before temporal charts", () => {
  const worldCompletion = dashboard.indexOf("<WorldProgressDoughnut");
  const continents = dashboard.indexOf('<section class="continent-section"');
  const badges = dashboard.indexOf("<AchievementGallery />");
  const timeline = dashboard.indexOf('<section class="timeline-section"');

  assert.ok(worldCompletion >= 0);
  assert.ok(worldCompletion < continents);
  assert.ok(continents < badges);
  assert.ok(badges < timeline);
  assert.equal([...dashboard.matchAll(/<AchievementGallery\s*\/>/g)].length, 1);
});

test("locked continent palette matches asset fills and both donut arcs", () => {
  const { continentVisuals } = loadPresentationModule("continentVisuals");
  const palette = {
    AF: ["#C5813D", "#F5E9DC"], // orange
    AS: ["#C87868", "#F6E5DE"], // coral
    EU: ["#397F83", "#DFECEC"], // teal
    NA: ["#8B70A8", "#ECE6F2"], // purple
    SA: ["#96705A", "#EEE5DF"], // earth
    OC: ["#548DB7", "#E2EDF5"], // blue
    AN: ["#57595B", "#E9EAEB"], // gray
  };
  for (const [code, [color, track]] of Object.entries(palette)) {
    const visual = continentVisuals[code];
    assert.equal(visual.color, color);
    assert.equal(visual.track, track);
    if (visual.asset.endsWith(".svg")) {
      const asset = readFileSync(new URL(`../../public${visual.asset}`, import.meta.url), "utf8");
      const fills = [...asset.matchAll(/fill(?:="|:)(#[\da-f]{6})/gi)];
      assert.ok(fills.length > 0);
      assert.ok(fills.every((fill) => fill[1] === color));
    }
  }
  assert.match(continentDonut, /:color="visual\?\.color"/);
  assert.match(continentDonut, /:track-color="visual\?\.track"/);
  assert.doesNotMatch(continentDonut, /v-if="(?:percentage|visitedCountries)|opacity:|disabled/);
});

test("continent count is inside the donut and silhouette is a separate sibling", () => {
  const { descriptor } = parse(continentDonut);
  const root = descriptor.template.ast.children.find((node) => node.tag === "div");
  const elements = root.children.filter((node) => node.type === 1);
  assert.deepEqual(elements.map((node) => node.tag), ["ProgressDonut", "div"]);
  assert.equal(elements[0].children.find((node) => node.type === 1).tag, "span");
  assert.equal(elements[1].children.find((node) => node.type === 1).tag, "img");
  assert.doesNotMatch(descriptor.styles[0].content, /(?:^|[;{\s])(?:position|background-image|transform):/);
});

test("KPI contexts describe the actual metrics with dynamic denominators", () => {
  const body = dashboard.match(
    /function metricRows\(data: PersonalProgression\) \{([\s\S]*?)\n\}/,
  )[1];
  const rows = new Function("data", "number", body);
  const data = {
    summary: {
      visitedCountries: 3,
      totalCountries: 123,
      exploredContinents: 2,
      revisitedCountries: 0,
      totalTravelDays: 42,
    },
    continents: [{}, {}, {}],
  };
  const metrics = rows(data, new Intl.NumberFormat("fr-FR"));
  assert.deepEqual(
    metrics.map((metric) => metric.value),
    [3, 2, 0, 42],
  );
  assert.deepEqual(
    metrics.map((metric) => metric.context),
    [
      "sur 123 dans le monde",
      "sur 3",
      "aucun pour l’instant",
      "sur l’ensemble de tes trips",
    ],
  );
  data.summary.revisitedCountries = 2;
  assert.equal(
    rows(data, new Intl.NumberFormat("fr-FR"))[2].context,
    "visités lors de plusieurs trips",
  );
});

test("country axis has an integer nice ceiling without changing timeline values", () => {
  const { countriesAxisMax } = loadPresentationModule("timelineScale");
  for (const [value, expected] of [
    [0, 5],
    [1, 5],
    [3, 5],
    [8, 10],
    [17, 20],
  ])
    assert.equal(countriesAxisMax(value), expected);
  for (const value of [25, 50, 100, 249, 1000]) {
    assert.ok(countriesAxisMax(value) > value);
    assert.ok(Number.isInteger(countriesAxisMax(value)));
  }
  assert.match(countriesChart, /min: 0/);
  assert.match(countriesChart, /beginAtZero: true/);
  assert.match(countriesChart, /ticks: \{ precision: 0/);
  assert.doesNotMatch(countriesChart, /totalCountries|suggestedMax/);
  assert.match(
    countriesChart,
    /data: props.points.map\(\(point\) => point.visitedCountries\)/,
  );
  assert.match(countriesChart, /formatter.format\(context.parsed.y\)/);
});

function compileComponent(source, id) {
  const { descriptor, errors } = parse(source, { filename: id });
  assert.deepEqual(errors, []);
  assert.doesNotThrow(() =>
    compileScript(descriptor, { id, inlineTemplate: true }),
  );
}

function progressionHarness(fetchProgression) {
  const source = readApp("composables/useProgression.ts").replace(
    /^import .*;\r?$/gm,
    "",
  );
  const module = { exports: {} };
  const scope = Vue.ref({ userId: "traveler-1" });
  let cachedState;
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      ...Vue,
      useState: (_key, initialize) => (cachedState ??= Vue.ref(initialize())),
      usePrivateSession: () => ({ scope }),
      useTripdexApi: () => ({}),
      getPersonalProgression: fetchProgression,
    },
  );
  const effectScope = Vue.effectScope();
  const progression = effectScope.run(() => module.exports.useProgression());
  return { progression, effectScope, scope };
}

test("progression dashboard and chart components compile as Vue SFCs", () => {
  for (const [id, source] of [
    ["ProgressionDashboard", dashboard],
    ["WorldProgressDoughnut", worldDonut],
    ["ContinentProgressDoughnut", continentDonut],
    ["CountriesTimelineChart", countriesChart],
    ["TravelDaysChart", daysChart],
  ])
    compileComponent(source, id);
});

test("personal progression API uses the authenticated M5.1 endpoint contract", () => {
  const service = readApp("services/api/progression.ts");
  assert.match(service, /api\.get<PersonalProgression>\("\/me\/progression"\)/);
  assert.match(progressionType, /worldCompletionPercentage: number/);
  assert.match(progressionType, /totalCountries: number/);
});

test("summary metrics use real M5.1 summary fields and explicit labels", () => {
  assert.match(dashboard, /progressionData\.summary\.visitedCountries/);
  assert.match(dashboard, /data\.summary\.exploredContinents/);
  assert.match(dashboard, /data\.summary\.revisitedCountries/);
  assert.match(dashboard, /data\.summary\.totalTravelDays/);
  assert.match(dashboard, /Pays revisités/);
  assert.doesNotMatch(dashboard, /totalRevisits/);
});

test("world donut receives backend numerator, denominator, and percentage", () => {
  assert.match(
    dashboard,
    /:visited-countries="progressionData\.summary\.visitedCountries"/,
  );
  assert.match(
    dashboard,
    /:total-countries="progressionData\.summary\.totalCountries"/,
  );
  assert.match(
    dashboard,
    /:percentage="progressionData\.summary\.worldCompletionPercentage"/,
  );
  assert.match(worldDonut, /:visited-countries="visitedCountries"/);
  assert.match(worldDonut, /:total-countries="totalCountries"/);
});

test("continent donuts are generated from the backend response", () => {
  assert.match(dashboard, /v-for="continent in orderedContinents"/);
  assert.match(dashboard, /const continentOrder = \["AF", "AS", "EU", "NA", "SA", "OC", "AN"\]/);
  assert.match(dashboard, /\[\.\.\.\(progressionData.value\?\.continents \?\? \[\]\)\]/);
  assert.match(dashboard, /:total-countries="continent\.totalCountries"/);
  assert.doesNotMatch(dashboard, /\b(?:249|195)\b/);
  assert.doesNotMatch(continentDonut, /\b(?:249|195)\b/);
});

test("timeline charts render M5.1 cumulative-country and travel-day points directly", () => {
  assert.match(dashboard, /:points="progressionData\.timeline\.countries"/);
  assert.match(dashboard, /:points="progressionData\.timeline\.travelDays"/);
  assert.match(
    countriesChart,
    /props\.points\.map\(\(point\) => point\.visitedCountries\)/,
  );
  assert.match(
    daysChart,
    /props\.points\.map\(\(point\) => point\.travelDays\)/,
  );
});

test("zero trips has a warm empty state and does not render empty timeline charts", () => {
  assert.match(dashboard, /summary\.visitedCountries === 0/);
  assert.match(dashboard, /Ton atlas est encore vierge/);
  assert.match(dashboard, /Logger un voyage/);
  assert.match(dashboard, /summary\.visitedCountries > 0/);
});

test("API error remains distinct from zero progress and can be retried", () => {
  assert.match(dashboard, /progressionError/);
  assert.match(dashboard, /progression\.retry\(\)/);
  assert.match(dashboard, /Ta progression n’est pas disponible/);
});

test("personal map remains present and receives only the existing visited-country list", () => {
  assert.match(dashboard, /<PersonalMap/);
  assert.match(dashboard, /:visited-iso3="visitedIso3"/);
  assert.match(dashboard, /:countries="countries"/);
  assert.doesNotMatch(dashboard, /residenceCountryId/);
  assert.doesNotMatch(dashboard, /residenceCountry.*visited/i);
});

test("Trip creation invalidates progression without coupling it to cover uploads", () => {
  const tripForm = readApp("components/TripForm.vue");
  const createBranch = tripForm.match(
    /if \(!savedTrip\.value\) \{([\s\S]*?)\n    \}/,
  )?.[1];
  const coverBranch = tripForm.match(
    /if \(cover\.value\) \{([\s\S]*?)\n    \}/,
  )?.[1];
  assert.ok(createBranch);
  assert.ok(coverBranch);
  assert.match(createBranch, /progression\.invalidate\(\)/);
  assert.doesNotMatch(coverBranch, /progression\.invalidate\(\)/);
});

test("progression is cached and reloads after a Trip invalidates it", async () => {
  let requests = 0;
  const payload = { summary: { visitedCountries: 2 } };
  const { progression, effectScope } = progressionHarness(async () => {
    requests++;
    return payload;
  });
  try {
    await progression.load();
    await progression.load();
    assert.equal(requests, 1);
    assert.equal(progression.data.value.summary.visitedCountries, 2);

    progression.invalidate();
    assert.equal(progression.invalidated.value, true);
    await progression.load();
    assert.equal(requests, 2);
    assert.equal(progression.invalidated.value, false);
  } finally {
    effectScope.stop();
  }
});

test("progression keeps API errors retryable instead of rendering zero data", async () => {
  let requests = 0;
  const payload = { summary: { visitedCountries: 1 } };
  const { progression, effectScope } = progressionHarness(async () => {
    requests++;
    if (requests === 1) throw new Error("network unavailable");
    return payload;
  });
  try {
    await progression.load();
    assert.equal(progression.data.value, null);
    assert.equal(
      progression.error.value,
      "Impossible de charger ta progression.",
    );

    await progression.retry();
    assert.equal(requests, 2);
    assert.equal(progression.data.value.summary.visitedCountries, 1);
    assert.equal(progression.error.value, null);
  } finally {
    effectScope.stop();
  }
});

test("a changed private session invalidates the cached user's progression", async () => {
  let requests = 0;
  const { progression, effectScope, scope } = progressionHarness(async () => {
    requests++;
    return { summary: { visitedCountries: requests } };
  });
  try {
    await progression.load();
    scope.value = { userId: "traveler-2" };
    await Vue.nextTick();
    assert.equal(progression.data.value, null);
    assert.equal(progression.invalidated.value, true);
    await progression.load();
    assert.equal(requests, 2);
    assert.equal(progression.data.value.summary.visitedCountries, 2);
  } finally {
    effectScope.stop();
  }
});
