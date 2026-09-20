import { loadDateUtility } from "./date-helpers.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { parse, compileScript } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { renderToString } from "vue/server-renderer";

const require = createRequire(import.meta.url);
const trip = {
  id: "trip-a",
  title: "Voyage test",
  startDate: "2026-03-12",
  endDate: "2026-03-28",
  countries: [
    {
      country: { id: "jp", name: "Japon", iso2: "JP" },
      position: 0,
      isRevisit: false,
    },
  ],
  cities: [
    { id: "tokyo", name: "Tokyo", countryId: "jp" },
    { id: "kyoto", name: "Kyoto", countryId: "jp" },
  ],
  rating: 4,
  review: "Un souvenir réel",
  coverUrl: "https://example.test/cover.jpg",
  coverStoragePath: "cover",
  containsRevisit: false,
};
function load(path, data = trip) {
  const filename = new URL("../../app/" + path, import.meta.url);
  const { descriptor } = parse(readFileSync(filename, "utf8"));
  const compiled = compileScript(descriptor, {
    id: path,
    inlineTemplate: true,
  });
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(compiled.content, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: (id) =>
        id === "~/utils/dates"
          ? loadDateUtility()
          : id.endsWith(".json")
            ? { default: require(id) }
            : id.startsWith("~/")
              ? id === "~/services/errors"
                ? {
                    statusCodeFrom: () => undefined,
                  }
                : id === "~/services/api/trips"
                  ? {
                      getTrip: async () => data,
                      removeTripCover: async () => ({}),
                      updateTripCover: async () => ({}),
                    }
                  : { default: load(id.slice(2), data) }
              : require(id),
      ...Vue,
      useRuntimeConfig: () => ({ app: { baseURL: "/" } }),
      useRoute: () => ({ params: { id: data.id } }),
      useTripdexApi: () => ({}),
      useTrips: () => ({ invalidate: () => {} }),
      useAsyncData: async () => ({
        data: Vue.ref(data),
        status: Vue.ref("success"),
        error: Vue.ref(null),
        refresh: () => {},
      }),
    },
  );
  return module.exports.default;
}
async function render(path, data = trip, props = { trip: data }) {
  const app = Vue.createSSRApp(load(path, data), props);
  for (const name of ["VSheet", "VCard", "VBtn", "NuxtLink"])
    app.component(name, {
      setup:
        (_, { slots }) =>
        () =>
          Vue.h("div", slots.default?.()),
    });
  app.component("VIcon", {
    props: ["icon"],
    setup: (props) => () => Vue.h("i", { "data-icon": props.icon }),
  });
  app.component("VDialog", { setup: () => () => null });
  app.component("CoverPicker", { setup: () => () => null });
  return renderToString(app);
}

test("Hero renders real cover, title, cities, dates and ordinary passport stamp", async () => {
  // Arrange
  const data = { ...trip };
  // Act
  const html = await render("components/trips/TripHero.vue", data);
  // Assert
  for (const value of [
    data.coverUrl,
    data.title,
    "Tokyo · Kyoto",
    "12 mars 2026 → 28 mars 2026",
    "Japon",
    "4 / 5",
    "Tampon de voyage",
  ])
    assert.ok(html.includes(value), value);
  assert.ok(!html.includes("revisit-stamp"));
});
test("Hero fallback and revisit stamp depend on the supplied backend flag", async () => {
  // Arrange
  const data = {
    ...trip,
    coverUrl: null,
    countries: [{ ...trip.countries[0], isRevisit: true }],
    containsRevisit: true,
  };
  // Act
  const html = await render("components/trips/TripHero.vue", data);
  // Assert
  assert.ok(html.includes("Souvenir sans photographie"));
  assert.ok(html.includes("revisit-stamp"));
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes('class="travel-stamp"'));
});
test("metadata is one surface containing countries, city count, dates, duration and rating", async () => {
  // Arrange
  const data = { ...trip };
  // Act
  const html = await render("components/trips/TripMetadata.vue", data);
  // Assert
  for (const value of ["Japon", "2 villes", "Dates", "Durée", "Note", "4 / 5"])
    assert.ok(html.includes(value), value);
});
test("detail renders numbered real cities without images and memory with ISO2 flag", async () => {
  // Arrange
  const data = { ...trip };
  // Act
  const html = await render("pages/trips/[id].vue", data);
  const cities = html.slice(
    html.indexOf('class="city-list"'),
    html.indexOf('class="trip-memory"'),
  );
  // Assert
  assert.ok(html.includes("Modifier la couverture"));
  assert.ok(html.includes("/country-flags/jp.svg"));
  const memory = html.slice(html.indexOf('id="memory-title"'));
  assert.ok(memory.includes("/country-flags/jp.svg"));
  assert.ok(html.includes(data.review));
  assert.ok(html.includes("<blockquote"));
  assert.equal((cities.match(/class="city-number"/g) || []).length, 2);
  assert.ok(cities.includes("Tokyo") && cities.includes("Kyoto"));
  assert.ok(!cities.includes("<img") && !cities.includes("\u2192"));
});
test("blank memory is absent and missing ISO2 uses generic destination icon", async () => {
  // Arrange
  const blank = { ...trip, review: "  ", coverUrl: null };
  const unknown = {
    ...trip,
    countries: [
      {
        country: { id: "jp", name: "Destination", iso2: "?" },
        position: 0,
        isRevisit: false,
      },
    ],
  };
  // Act
  const emptyHtml = await render("pages/trips/[id].vue", blank);
  const fallbackHtml = await render("pages/trips/[id].vue", unknown);
  // Assert
  assert.ok(!emptyHtml.includes('class="trip-memory"'));
  assert.ok(emptyHtml.includes("Ajouter une couverture"));
  assert.match(fallbackHtml, /id="memory-title"[^]*?data-icon="mdi-earth"/);
});
test("multi-country metadata shows each flag while memory uses the globe", async () => {
  // Arrange
  const data = {
    ...trip,
    countries: [
      ...trip.countries,
      {
        country: { id: "us", name: "United States", iso2: "us" },
        position: 1,
        isRevisit: false,
      },
    ],
  };
  // Act
  const html = await render("pages/trips/[id].vue", data);
  const memory = html.slice(html.indexOf('id="memory-title"'));
  // Assert
  assert.ok(
    html.includes("/country-flags/jp.svg") &&
      html.includes("/country-flags/us.svg"),
  );
  assert.ok(html.includes("Japon") && html.includes("United States"));
  assert.ok(memory.includes('data-icon="mdi-earth"'));
  assert.ok(!memory.includes("/country-flags/"));
  assert.ok(!html.includes('class="travel-stamp"'));
  assert.ok(!html.includes('class="revisit-stamp"'));
});

test("CountryFlag renders local SVGs for JP, US, FR and lowercase codes with accessible names", async () => {
  // Arrange
  const codes = ["JP", "US", "FR", "us"];
  // Act
  const results = await Promise.all(
    codes.map((iso2) =>
      render("components/tripdex/CountryFlag.vue", trip, {
        iso2,
        name: "Destination",
      }),
    ),
  );
  // Assert
  results.forEach((html, index) => {
    assert.ok(
      html.includes(`/country-flags/${codes[index].toLowerCase()}.svg`),
    );
    assert.ok(html.includes('alt="Drapeau : Destination"'));
    assert.ok(!html.includes("mdi-earth"));
    assert.doesNotMatch(html, /[\u{1F1E6}-\u{1F1FF}]/u);
  });
});

test("CountryFlag falls back safely for missing, malformed and unknown codes", async () => {
  // Arrange
  const codes = [undefined, null, "", "JPN", "?", "ZZ", "../jp"];
  // Act
  const results = await Promise.all(
    codes.map((iso2) =>
      render("components/tripdex/CountryFlag.vue", trip, { iso2 }),
    ),
  );
  // Assert
  results.forEach((html) => {
    assert.ok(html.includes('data-icon="mdi-earth"'));
    assert.ok(!html.includes("<img"));
  });
});

test("cover dialog reuses the existing picker, FormData and mutation actions", () => {
  // Arrange
  const source = readFileSync(
    new URL("../../app/pages/trips/[id].vue", import.meta.url),
    "utf8",
  );
  // Act
  const pickerCount = (source.match(/<CoverPicker/g) || []).length;
  // Assert
  assert.equal(pickerCount, 1);
  for (const value of [
    '@click="coverDialog = true"',
    'v-model="cover"',
    'body.append("cover", cover.value)',
    "removeTripCover(api, trip.value.id)",
    "updateTripCover(api, trip.value.id, body)",
    '@click="changeCover()"',
    '@click="changeCover(true)"',
  ])
    assert.ok(source.includes(value), value);
});
