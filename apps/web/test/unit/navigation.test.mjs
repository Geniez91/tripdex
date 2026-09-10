import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../../app/utils/navigation.ts", import.meta.url),
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
const { activeNavigation } = module.exports;

test("navigation keeps parent sections active across nested routes", () => {
  // Arrange
  const paths = new Map([
    ["/", "explorer"],
    ["/journal", "journal"],
    ["/trips/trip-a", "journal"],
    ["/profile/map", "map"],
    ["/profile/map/overview", "map"],
    ["/profile", "profile"],
  ]);

  // Act / Assert
  for (const [path, expected] of paths)
    assert.equal(activeNavigation(path), expected, path);
});

test("public and auth entry routes have no private navigation selection", () => {
  // Arrange
  const paths = ["/login", "/register", "/auth/callback"];

  // Act / Assert
  for (const path of paths) assert.equal(activeNavigation(path), null, path);
});
