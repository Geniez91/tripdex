import assert from "node:assert/strict";
import { test } from "node:test";
import { loadDateUtility } from "./date-helpers.mjs";
const { formatDate, formatTripPeriod, civilYear } = loadDateUtility();
for (const timezone of ["UTC", "America/Los_Angeles", "Pacific/Kiritimati"]) {
  test("civil dates stay French in " + timezone, () => {
    // Arrange
    const previous = process.env.TZ;
    process.env.TZ = timezone;
    try {
      // Act
      const dates = ["2026-09-11", "2026-09-11T00:00:00.000Z"].map((value) =>
        formatDate(value),
      );
      // Assert
      assert.deepEqual(dates, ["11/09/2026", "11/09/2026"]);
      assert.equal(civilYear("2026-01-01T00:00:00.000Z"), 2026);
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
}
test("editorial dates and captions", () => {
  // Arrange
  const value = "2026-09-11";
  // Act
  const editorial = formatDate(value, "editorial");
  const caption = formatDate(value, "caption");
  // Assert
  assert.equal(editorial, "11 septembre 2026");
  assert.equal(caption, "sept. 2026");
});
test("periods preserve the existing arrow presentation across months and years", () => {
  // Arrange
  const cases = [
    ["2026-09-03", "2026-09-12", "3 septembre 2026 → 12 septembre 2026"],
    ["2026-09-30", "2026-10-02", "30 septembre 2026 → 2 octobre 2026"],
    ["2025-12-31", "2026-01-01", "31 décembre 2025 → 1 janvier 2026"],
    ["2026-09-11", null, "11 septembre 2026"],
  ];
  for (const [start, end, expected] of cases) {
    // Act
    const actual = formatTripPeriod(start, end);
    // Assert
    assert.equal(actual, expected);
  }
});
test("optional and invalid dates have no visible invalid-date text", () => {
  // Arrange
  const values = [null, undefined, "", "invalid", "2026-02-30"];
  for (const value of values) {
    // Act
    const date = formatDate(value);
    const year = civilYear(value);
    // Assert
    assert.equal(date, "");
    assert.equal(year, null);
  }
});
