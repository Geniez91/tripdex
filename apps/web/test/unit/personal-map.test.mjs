import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as Vue from 'vue';
import { parse, compileScript } from '@vue/compiler-sfc';
const france = { id: 'fr', iso3: 'FRA', name: 'France' };
const canada = { id: 'ca', iso3: 'CAN', name: 'Canada' };
const source = readFileSync(new URL('../../app/components/profile/PersonalMap.vue', import.meta.url), 'utf8');
const descriptor = parse(source).descriptor;
function harness(home, visitedIso3 = []) {
  const residence = Vue.ref({ residenceCountry: home });
  const props = Vue.reactive({ countries: [france, canada], visitedIso3, available: true, loading: false });
  const body = descriptor.scriptSetup.content.replace(/import[\s\S]*?from\s+["'][^"']+["'];/g, '');
  const state = vm.runInNewContext(ts.transpileModule(`(() => { ${body}; return { appearances, home }; })()`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { ...Vue, defineProps: () => props, useResidence: () => ({ data: residence }) });
  return { ...state, residence, props };
}
test('residence receives a distinct color and country information without a house', () => {
  const h = harness(france);
  assert.equal(h.appearances.value.FRA.fill, '#B97864');
  assert.equal(h.appearances.value.FRA.description, 'Ton pays de résidence · À découvrir');
  assert.match(descriptor.template.content, /Résidence ·/);
  assert.doesNotMatch(source, /HomeCountryMarker|mdi-home|foreignObject/);
});
test('null residence keeps ordinary country colors', () => {
  const h = harness(null);
  assert.equal(h.home.value, null);
  assert.equal(h.appearances.value.FRA.fill, 'rgb(var(--v-theme-map-land))');
});
test('changing residence moves the color from France to Canada', () => {
  const h = harness(france);
  h.residence.value = { residenceCountry: canada };
  assert.equal(h.appearances.value.FRA.fill, 'rgb(var(--v-theme-map-land))');
  assert.equal(h.appearances.value.CAN.fill, '#B97864');
});
test('visited residence retains its visited state and does not change progression', () => {
  const h = harness(france, ['FRA']);
  assert.equal(h.appearances.value.FRA.description, 'Ton pays de résidence · Visité');
  assert.equal(h.appearances.value.FRA.fill, '#B97864');
  h.residence.value = { residenceCountry: canada };
  assert.equal(h.appearances.value.FRA.fill, 'rgb(var(--v-theme-map-visited))');
  assert.deepEqual([...h.props.visitedIso3], ['FRA']);
});
test('personal map compiles and community remains separate', () => {
  assert.doesNotThrow(() => compileScript(descriptor, { id: 'personal', inlineTemplate: true }));
  const page = parse(readFileSync(new URL('../../app/pages/index.vue', import.meta.url), 'utf8')).descriptor;
  assert.doesNotThrow(() => compileScript(page, { id: 'page', inlineTemplate: true }));
  const dashboard = parse(readFileSync(new URL('../../app/components/progression/ProgressionDashboard.vue', import.meta.url), 'utf8')).descriptor;
  assert.doesNotThrow(() => compileScript(dashboard, { id: 'progression', inlineTemplate: true }));
  assert.match(page.template.content, /<ProgressionDashboard\s+v-if="personalMap"/);
  assert.match(dashboard.template.content, /<PersonalMap/);
  assert.match(descriptor.template.content, /:visited-iso3="visitedIso3"/);
});
