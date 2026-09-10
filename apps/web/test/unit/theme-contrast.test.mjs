import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((value) => {
      const channel = parseInt(value, 16) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test("TripDex text, actions and map boundaries meet contrast thresholds", () => {
  // Arrange
  const source = readFileSync(
    new URL("../../vuetify.config.ts", import.meta.url),
    "utf8",
  );
  const module = { exports: {} };
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: () => ({ defineVuetifyConfiguration: (value) => value }),
  });
  const colors = module.exports.default.theme.themes.tripdex.colors;
  const pairs = [
    ["on-primary", "primary", 4.5],
    ["on-background", "background", 4.5],
    ["on-surface", "surface", 4.5],
    ["muted", "background", 4.5],
    ["muted", "surface", 4.5],
    ["muted", "ocean", 4.5],
    ["ink", "surface", 4.5],
    ["map-border", "map-land", 3],
    ["map-visited", "map-land", 3],
    ["ink", "map-selected", 3],
  ];

  // Act
  const contrasts = pairs.map(([foreground, background, minimum]) => {
    const values = [
      luminance(colors[foreground]),
      luminance(colors[background]),
    ].sort((a, b) => b - a);
    return {
      foreground,
      background,
      minimum,
      ratio: (values[0] + 0.05) / (values[1] + 0.05),
    };
  });

  // Assert
  for (const { foreground, background, minimum, ratio } of contrasts) {
    assert.ok(
      ratio >= minimum,
      `${foreground} on ${background}: ${ratio.toFixed(2)} < ${minimum}`,
    );
  }
});
