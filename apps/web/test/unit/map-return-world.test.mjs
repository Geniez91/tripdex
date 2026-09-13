import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as Vue from 'vue';
import { parse } from '@vue/compiler-sfc';
import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3-geo';
const utils = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../../app/services/mapZoom.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: utils.exports });
const { descriptor } = parse(readFileSync(new URL('../../app/components/WorldMap.vue', import.meta.url), 'utf8'));
const stripped = descriptor.scriptSetup.content.replace(/import[\s\S]*?from\s+["'][^"']+["'];/g, '');
const source = ts.transpileModule(`(async () => { ${stripped}\n return { zoomTransform, renderedZoomTransform, setZoom, returnWorld, viewportElement, viewport, anchors, startPan, pan, endPan, handleWheel }; })()`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
async function harness(width) {
  let now = 0, id = 0, resize;
  const frames = new Map();
  const props = Vue.reactive({ zoomable: true, selectedIso3: null, visitedIso3: [] });
  const features = [[20, 30], [-60, -20]].map((point, index) => ({ type: 'Feature', properties: { iso3: index ? 'BBB' : 'AAA', label: point }, geometry: { type: 'Point', coordinates: point } }));
  features.push({ type: 'Feature', properties: { iso3: null, name: 'Somaliland', label: [46, 10] },
    geometry: { type: 'Point', coordinates: [46, 10] } });
  const scope = Vue.effectScope();
  const state = await scope.run(() => vm.runInNewContext(source, {
    ...Vue, ...utils.exports, geoNaturalEarth1, geoPath, geoGraticule10,
    defineProps: () => props, defineEmits: () => (_event, code) => { props.selectedIso3 = code; },
    useAsyncData: async () => ({ data: Vue.ref({ features }), error: Vue.ref(null), status: Vue.ref('success'), refresh() {} }),
    getWorldGeometry() {}, onBeforeUnmount() {},
    window: { matchMedia: () => ({ matches: false }) }, performance: { now: () => now },
    requestAnimationFrame: frame => { frames.set(++id, frame); return id; },
    cancelAnimationFrame: key => frames.delete(key),
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} disconnect() {} },
    DOMPoint: class { constructor(x, y) { this.x = x; this.y = y; } },
  }));
  state.viewportElement.value = {};
  await Vue.nextTick();
  const resizeTo = value => resize([{ contentRect: { width: value } }]);
  resizeTo(width);
  async function tick(ms) {
    now += ms;
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(frame => frame(now)); await Vue.nextTick();
  }
  async function focus(code) { props.selectedIso3 = code; await Vue.nextTick(); await tick(450); }
  function pan() {
    const currentTarget = { getScreenCTM: () => null, setPointerCapture() {}, hasPointerCapture: () => false };
    const event = { currentTarget, button: 0, isPrimary: true, pointerId: 1, clientX: 100, clientY: 100 };
    state.startPan(event); state.pan({ ...event, clientX: 130, clientY: 120 }); state.endPan(event);
  }
  function assertWorld() {
    assert.deepEqual({ ...state.zoomTransform.value }, { x: 0, y: 0, k: 1 });
    assert.equal(state.renderedZoomTransform.value, 'translate(0 0) scale(1)');
    assert.equal(props.selectedIso3, null);
    assert.equal(frames.size, 0);
  }
  return { state, props, tick, focus, pan, resizeTo, assertWorld, dispose: () => scope.stop() };
}
for (const width of [356, 1326]) {
  for (const scenario of ['zoom', 'pan + zoom', 'focus', 'focus + zoom', 'maximum zoom']) {
    test(`${width}px: ${scenario} returns to world with one click despite layout notification`, async () => {
      const h = await harness(width);
      try {
        const anchorBefore = [...h.state.anchors.value.get('AAA')];
        if (scenario.includes('focus')) await h.focus('AAA');
        if (scenario.includes('zoom')) h.state.setZoom(scenario.includes('maximum') ? 24 : 4);
        if (scenario.includes('pan')) h.pan();
        h.state.returnWorld(); await Vue.nextTick(); await h.tick(100);
        h.resizeTo(width); // ResizeObserver may report height/layout changes without a new width.
        await h.tick(350);
        h.assertWorld();
        assert.deepEqual([...h.state.anchors.value.get('AAA')], anchorBefore);
        h.state.handleWheel({ deltaY: -100, deltaMode: 0, clientX: 100, clientY: 80,
          currentTarget: { getScreenCTM: () => null }, preventDefault() {} });
        const expected = utils.exports.zoomAroundPoint(utils.exports.worldTransform(), Math.exp(.2), { x: 100, y: 80 });
        assert.deepEqual({ ...h.state.zoomTransform.value }, { ...expected });
      } finally { h.dispose(); }
    });
  }
  test(`${width}px: resize during reset preserves its destination and the next country focus`, async () => {
    const h = await harness(width);
    try {
      await h.focus('AAA'); h.state.returnWorld(); await Vue.nextTick(); await h.tick(150);
      h.resizeTo(width * .8); await h.tick(300); h.assertWorld();
      await h.focus('BBB');
      const anchor = h.state.anchors.value.get('BBB');
      const transform = h.state.zoomTransform.value;
      assert.ok(Math.abs(transform.x + anchor[0] * transform.k - h.state.viewport.value.width / 2) < 1e-8);
      assert.ok(Math.abs(transform.y + anchor[1] * transform.k - h.state.viewport.value.height / 2) < 1e-8);
    } finally { h.dispose(); }
  });
}
test('manual interaction interrupts the animation at the displayed state without a stale frame', async () => {
  const h = await harness(960);
  try {
    h.state.setZoom(24); h.state.returnWorld(); await h.tick(150);
    h.state.setZoom(3); const manual = { ...h.state.zoomTransform.value };
    await h.tick(450); assert.deepEqual({ ...h.state.zoomTransform.value }, manual);
    h.state.returnWorld(); await h.tick(450); h.assertWorld();
  } finally { h.dispose(); }
});
