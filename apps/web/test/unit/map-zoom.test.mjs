import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../../app/services/mapZoom.ts", import.meta.url),
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
const { clampMapZoom, zoomAroundPoint, fitMapBounds, worldTransform, resizeMapTransform } = module.exports;

test("zooming around a point keeps that point stable", () => {
  // Arrange
  const point = { x: 240, y: 180 };

  // Act
  const result = zoomAroundPoint({ x: 0, y: 0, k: 1 }, 2, point);

  // Assert
  assert.equal(result.k, 2);
  assert.equal(result.x + point.x * result.k, point.x);
  assert.equal(result.y + point.y * result.k, point.y);
});

test("zoom scale remains within map bounds", () => {
  // Arrange / Act / Assert
  assert.equal(clampMapZoom(0.5), 1);
  assert.equal(clampMapZoom(2), 2);
  assert.equal(clampMapZoom(30), 24);
});

test("geometry bounds determine centered focus with padding", () => {
  // Arrange
  const bounds = [[200, 100], [400, 300]];
  const viewport = { width: 1000, height: 500 };
  // Act
  const camera = fitMapBounds(bounds, viewport);
  const padded = fitMapBounds(bounds, viewport, 0.2);
  // Assert
  assert.equal(camera.k, 2);
  assert.equal(camera.x + 300 * camera.k, 500);
  assert.equal(camera.y + 200 * camera.k, 250);
  assert.ok(padded.k < camera.k);
});

test("manual zoom starts at the focused camera and preserves its cursor anchor", () => {
  // Arrange
  const focus = fitMapBounds([[200, 100], [400, 300]], { width: 1000, height: 500 });
  const cursor = { x: 700, y: 210 };
  const geographicalPoint = { x: (cursor.x - focus.x) / focus.k, y: (cursor.y - focus.y) / focus.k };
  // Act
  const next = zoomAroundPoint(focus, focus.k * 1.2, cursor);
  // Assert
  assert.equal(next.x + geographicalPoint.x * next.k, cursor.x);
  assert.equal(next.y + geographicalPoint.y * next.k, cursor.y);
});

test("return world clears both translation and scale", () => {
  // Arrange
  const focus = fitMapBounds([[20, 10], [40, 30]], { width: 1000, height: 500 });
  // Act
  const world = worldTransform();
  const next = zoomAroundPoint(world, 1, { x: 500, y: 250 });
  // Assert
  assert.ok(focus.k > 1);
  assert.equal(next.x, 0);
  assert.equal(next.y, 0);
  assert.equal(next.k, 1);
});

test("resize preserves camera position in the resized projection", () => {
  // Arrange
  const before = { width: 1000, height: 500 };
  const after = { width: 500, height: 250 };
  const focus = fitMapBounds([[200, 100], [400, 300]], before);
  // Act
  const resized = resizeMapTransform(focus, before, after);
  const recomputed = fitMapBounds([[100, 50], [200, 150]], after);
  // Assert
  assert.equal(resized.k, recomputed.k);
  assert.equal(resized.x, recomputed.x);
  assert.equal(resized.y, recomputed.y);
});

test("tiny and wide geometries produce finite bounded focus", () => {
  // Arrange
  const viewport = { width: 1000, height: 500 };
  // Act
  const tiny = fitMapBounds([[20, 30], [20, 30]], viewport);
  const wide = fitMapBounds([[0, 100], [1000, 200]], viewport);
  // Assert
  assert.equal(tiny.k, 24);
  assert.equal(wide.k, 1);
  assert.ok(Number.isFinite(tiny.x) && Number.isFinite(tiny.y));
});

 test("country selection uses projected GeoJSON and keeps overlays in the camera layer", async () => {
  // Arrange
  const { geoNaturalEarth1, geoPath } = await import('d3-geo');
  const { parse } = await import('@vue/compiler-sfc');
  const Vue = await import('vue');
  const source = readFileSync(new URL('../../app/components/WorldMap.vue', import.meta.url), 'utf8');
  const feature = { type: 'Feature', properties: { iso3: 'TST', label: [20, 30] }, geometry: { type: 'Point', coordinates: [20, 30] } };
  const props = Vue.reactive({ zoomable: true, selectedIso3: null, visitedIso3: [] });
  const { descriptor } = parse(source);
  const stripped = descriptor.scriptSetup.content.replace(/import[\s\S]*?from\s+["'][^"']+["'];/g, '');
  const body = ts.transpileModule(`(async () => { ${stripped}\n return { zoomTransform, setZoom, returnWorld, viewport, anchors }; })()`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const emitted = [];
  // Act
  const state = await vm.runInNewContext(body, { ...Vue, ...module.exports, geoNaturalEarth1, geoPath,
    geoGraticule10: () => ({ type: 'MultiLineString', coordinates: [] }),
    defineProps: () => props, defineEmits: () => (...args) => emitted.push(args),
    useAsyncData: async () => ({ data: Vue.ref({ features: [feature] }), error: Vue.ref(null), status: Vue.ref('success'), refresh() {} }),
    getWorldGeometry() {}, onBeforeUnmount() {}, cancelAnimationFrame() {},
    window: { matchMedia: () => ({ matches: true }) },
  });
  props.selectedIso3 = 'TST';
  await Vue.nextTick();
  const focused = { ...state.zoomTransform.value };
  state.setZoom(focused.k / 2);
  const manual = { ...state.zoomTransform.value };
  state.returnWorld();
  // Assert
  const anchor = state.anchors.value.get('TST');
  assert.equal(focused.x + anchor[0] * focused.k, state.viewport.value.width / 2);
  assert.equal(focused.y + anchor[1] * focused.k, state.viewport.value.height / 2);
  assert.equal(manual.k, focused.k / 2);
  assert.equal(props.selectedIso3, 'TST');
  assert.equal(state.zoomTransform.value.k, 1);
  assert.equal(state.zoomTransform.value.x, 0);
  assert.equal(state.zoomTransform.value.y, 0);
  assert.equal(emitted.at(-1)[1], null);
  const layer = descriptor.template.content.slice(descriptor.template.content.indexOf('<g class="map-zoom-layer"'));
  assert.ok(layer.indexOf('name="routes"') < layer.lastIndexOf('</g>'));
  assert.ok(layer.indexOf('name="annotations"') < layer.lastIndexOf('</g>'));
 });
