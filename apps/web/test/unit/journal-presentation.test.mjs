import { loadDateUtility } from "./date-helpers.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const entry = readFileSync(
  new URL("../../app/components/journal/JournalEntry.vue", import.meta.url),
  "utf8",
);
const journal = readFileSync(
  new URL("../../app/pages/journal.vue", import.meta.url),
  "utf8",
);
const detail = readFileSync(
  new URL("../../app/pages/trips/[id].vue", import.meta.url),
  "utf8",
);
const timeline = readFileSync(
  new URL("../../app/utils/journalTimeline.ts", import.meta.url),
  "utf8",
);
const metadata = readFileSync(
  new URL("../../app/components/trips/TripMetadata.vue", import.meta.url),
  "utf8",
);
const hero = readFileSync(
  new URL("../../app/components/trips/TripHero.vue", import.meta.url),
  "utf8",
);

test("JournalEntry uses backend revisit state and links to the trip", () => {
  // Arrange
  const source = entry;
  // Act
  const hasBackendFlag = source.includes('v-if="trip.isRevisit"');
  const hasTripLink = source.includes(':to="`/trips/${trip.id}`"');
  // Assert
  assert.equal(hasBackendFlag, true);
  assert.equal(hasTripLink, true);
  assert.equal(source.includes("formatTripPeriod"), true);
  assert.equal(source.includes("revisitedCountryIds"), false);
});

test("Journal and entry provide clear fallbacks for missing covers and empty data", () => {
  // Arrange
  // Act
  const hasPhotoFallback = entry.includes("Souvenir à ajouter");
  const hasEmptyState = journal.includes(
    "Ton carnet attend sa première aventure.",
  );
  // Assert
  assert.equal(hasPhotoFallback, true);
  assert.equal(hasEmptyState, true);
});

test("trip detail keeps both cover mutation actions available", () => {
  // Arrange
  // Act
  const hasUpload = detail.includes("updateTripCover");
  const hasDelete = detail.includes("removeTripCover");
  // Assert
  assert.equal(hasUpload, true);
  assert.equal(hasDelete, true);
});

test("trip detail uses existing trip fields without adding map or city photo data", () => {
  // Arrange
  const source = detail;
  // Act
  const usesRealFields = ["trip.title", "trip.countries"].every((field) =>
    hero.includes(field),
  );
  const usesReview = source.includes("trip.review");
  const usesMetadataFields = ["props.trip.startDate", "trip.rating"].every(
    (field) => metadata.includes(field),
  );
  // Assert
  assert.equal(usesRealFields, true);
  assert.equal(usesReview, true);
  assert.equal(usesMetadataFields, true);
  assert.equal(source.includes("trip.cities"), true);
  assert.equal(source.includes('to="/journal"'), true);
  assert.equal(source.includes("TripHero"), true);
  assert.equal(source.includes("Google Maps"), false);
  assert.equal(source.includes("city.coverUrl"), false);
});

test("timeline years derive from dates without changing trip order", () => {
  // Arrange
  const source = timeline;
  const trips = [
    { id: "later", startDate: "2026-05-01" },
    { id: "earlier", startDate: "2025-08-01" },
  ];
  // Act
  const displayedYears = loadDateUtility("journalTimeline").journalYears(trips);
  // Assert
  assert.equal(source.includes("trips.map"), true);
  assert.deepEqual(displayedYears, [2026, 2025]);
  assert.deepEqual(
    trips.map((trip) => trip.id),
    ["later", "earlier"],
  );
});
