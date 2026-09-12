import assert from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../../app/services/mappers/tripMapper.ts", import.meta.url),
  "utf8",
);
const module = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  { module, exports: module.exports },
);
const { toCreateTripInput } = module.exports;

test("maps a complete form model to the create trip input with private visibility by default", () => {
  // Arrange
  const values = {
    title: "Japan 2026",
    startDate: "2026-03-12",
    endDate: "2026-03-28",
    countryIds: ["jp", "fr"],
    cityIds: ["tokyo", "kyoto"],
    rating: 5,
    review: "Un voyage marquant",
    visibility: "private",
  };

  // Act
  const input = toCreateTripInput(values);

  // Assert
  assert.deepEqual(input, {
    title: "Japan 2026",
    startDate: "2026-03-12",
    endDate: "2026-03-28",
    countryIds: ["jp", "fr"],
    cityIds: ["tokyo", "kyoto"],
    rating: 5,
    review: "Un voyage marquant",
    visibility: "private",
  });
});

test("maps empty optional form values to null", () => {
  // Arrange
  const values = {
    title: "Escapade",
    startDate: "2026-06-01",
    endDate: "",
    countryIds: ["pt"],
    cityIds: [],
    rating: null,
    review: "",
  };

  // Act
  const input = toCreateTripInput(values);

  // Assert
  assert.equal(input.endDate, null);
  assert.equal(input.review, null);
  assert.equal(input.rating, null);
});

test("preserves explicit public visibility and does not invent fields", () => {
  // Arrange
  const countryIds = ["es"];
  const cityIds = ["barcelona"];
  const values = {
    title: "Retour en Espagne",
    startDate: "2026-09-10",
    endDate: "2026-09-15",
    countryIds,
    cityIds,
    rating: 3,
    review: "Une note courte",
    visibility: "public",
  };

  // Act
  const input = toCreateTripInput(values);

  // Assert
  assert.deepEqual(input.countryIds, countryIds);
  assert.deepEqual(input.cityIds, cityIds);
  assert.equal(input.title, values.title);
  assert.equal(input.startDate, values.startDate);
  assert.equal(input.endDate, values.endDate);
  assert.equal(input.rating, values.rating);
  assert.equal(input.review, values.review);
  assert.equal(input.visibility, "public");
  assert.deepEqual(Object.keys(input).sort(), [
    "cityIds",
    "countryIds",
    "endDate",
    "rating",
    "review",
    "startDate",
    "title",
    "visibility",
  ]);
});
