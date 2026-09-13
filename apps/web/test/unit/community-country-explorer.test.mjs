import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { parse, compileScript } from '@vue/compiler-sfc';
import * as Vue from 'vue';
import { renderToString } from 'vue/server-renderer';
import { loadDateUtility } from './date-helpers.mjs';
const require = createRequire(import.meta.url);

const country = { id: 'jpn-id', iso2: 'JP', iso3: 'JPN', name: 'Japan', slug: 'japan', continentCode: 'AS' };
const statistics = { country, travelers: 18, travelersNow: 3, trending: false, topOrigins: [] };
const detail = {
  country: { id: country.id, iso2: country.iso2, iso3: country.iso3, name: country.name },
  stats: { travelers: 42, travelersNow: 3, averageRating: 4.6, ratingCount: 8 },
  recentTrips: [{ id: 'trip-1', title: 'Tokyo spring', createdAt: '2026-04-02T00:00:00.000Z',
    startDate: '2026-03-01T00:00:00.000Z', endDate: '2026-03-08T00:00:00.000Z', rating: 5,
    review: 'A lovely week', coverUrl: 'https://signed.test/trip.jpg', user: { username: 'real_traveler' } }],
  memory: { countryCode: 'JPN', countryName: 'Japan', imageUrl: 'https://signed.test/winner.jpg',
    contestId: 'contest-1', winnerSubmissionId: 'winner-1', user: { username: 'real_winner', avatarUrl: null },
    trip: { id: 'winner-trip', title: 'Winner trip' } },
};

let mobile = false;
function component(path) {
  const source = readFileSync(new URL(`../../app/${path}`, import.meta.url), 'utf8');
  const { descriptor, errors } = parse(source);
  assert.deepEqual(errors, []);
  const script = compileScript(descriptor, { id: path, inlineTemplate: true });
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(script.content, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, {
    module, exports: module.exports, ...Vue, setTimeout, clearTimeout,
    useId: Vue.useId,
    useDisplay: () => ({ smAndDown: Vue.ref(mobile) }),
    useRuntimeConfig: () => ({ public: { apiBase: 'https://api.tripdex.test' } }),
    useAsyncData: async key => {
      const value = typeof key === 'string' ? key : key.value;
      return value === 'community-memories'
        ? { data: Vue.ref([]) }
        : { data: Vue.ref({ year: 2026, asOfDate: '2026-09-13', countries: [statistics] }),
            status: Vue.ref('success'), error: Vue.ref(null), refresh: async () => {} };
    },
    require: name => {
      if (name === '~/services/api/community') return {
        getCommunityStatistics: async () => ({ year: 2026, asOfDate: '2026-09-13', countries: [statistics] }),
        getCommunityCountryExplorer: async () => detail,
      };
      if (name === '~/services/api/photo-contests') return { getCountryMemories: async () => [] };
      if (name === '~/services/communityMap') return {
        communityAppearances: () => ({}), isCommunityYear: value => value > 0,
        selectedFlows: () => [],
      };
      if (name === '~/utils/dates') return loadDateUtility();
      if (name === '~/components/tripdex/CountryFlag.vue') return { default: {
        props: ['iso2', 'name'], setup: props => () => Vue.h('span', { class: 'country-flag' }, props.iso2),
      } };
      if (name.endsWith('.vue')) {
        if (name.includes('CommunityCountryPreview.vue')) return { default: component('components/community/CommunityCountryPreview.vue') };
        if (name.includes('CommunityCountryPanelContent.vue')) return { default: component('components/community/CommunityCountryPanelContent.vue') };
        if (name.includes('CommunityCountryPanel.vue')) return { default: component('components/community/CommunityCountryPanel.vue') };
        return { default: { render: () => Vue.h('div') } };
      }
      return require(name);
    },
  });
  return module.exports.default;
}

function vuetifyStubs() {
  const wrapper = tag => ({
    inheritAttrs: false,
    setup: (_, { attrs, slots }) => () => Vue.h(tag, attrs, slots.default?.()),
  });
  return {
    VCard: wrapper('div'), VDivider: wrapper('hr'), VChip: wrapper('span'),
    VIcon: { props: ['icon'], setup: props => () => Vue.h('i', { 'aria-hidden': 'true' }, props.icon) },
    VImg: { props: ['src', 'alt'], setup: props => () => Vue.h('img', { src: props.src, alt: props.alt }) },
    VBtn: { inheritAttrs: false, setup: (_, { attrs, slots }) => () => Vue.h('button', attrs, slots.default?.() ?? attrs['aria-label'] ?? '') },
    VBottomSheet: { props: ['modelValue'], setup: (props, { slots }) => () => Vue.h('div', { class: 'bottom-sheet', 'data-open': props.modelValue }, props.modelValue ? slots.default?.() : []) },
    VSkeletonLoader: wrapper('div'), VAutocomplete: wrapper('div'),
    CommunityMapControls: wrapper('div'), CommunityFlowLayer: wrapper('div'),
    CommunityMemoryMarker: wrapper('div'),
    WorldMap: {
      props: ['selectedIso3', 'zoomable'], emits: ['select', 'hover-country'],
      setup: (props, { emit }) => () => Vue.h('div', { class: 'stub-world-map', 'data-selected': props.selectedIso3 ?? '' }, [
        Vue.h('button', { class: 'select-japan', onClick: () => emit('select', 'JPN') }, 'Japan'),
        Vue.h('button', { class: 'hover-japan', onPointerenter: () => emit('hover-country', 'JPN', { clientX: 30, clientY: 40 }) }, 'Hover Japan'),
      ]),
    },
  };
}

function node(tag) { return { tag, props: {}, children: [], parent: null, text: '' }; }
function mount(componentType, props, onClose = () => {}) {
  const renderer = Vue.createRenderer({
    createElement: tag => node(tag), createText: text => ({ tag: '#text', text, children: [], props: {} }),
    createComment: text => ({ tag: '#comment', text, children: [], props: {} }),
    insert(el, parent, anchor) { el.parent = parent; const at = anchor ? parent.children.indexOf(anchor) : -1; if (at < 0) parent.children.push(el); else parent.children.splice(at, 0, el); },
    remove(el) { if (el.parent) el.parent.children = el.parent.children.filter(child => child !== el); },
    setText(el, text) { el.text = text; }, setElementText(el, text) { el.text = text; el.children = []; },
    patchProp(el, key, _old, value) { el.props[key] = value; },
    parentNode: el => el.parent, nextSibling: el => { const list = el.parent?.children ?? []; return list[list.indexOf(el) + 1] ?? null; },
  });
  const root = node('root');
  const app = renderer.createApp({ render: () => Vue.h(componentType, { ...props, onClose }) });
  for (const [name, stub] of Object.entries(vuetifyStubs())) app.component(name, stub);
  app.mount(root);
  const all = () => {
    const result = [];
    const visit = current => { result.push(current); for (const child of current.children ?? []) visit(child); };
    visit(root);
    return result;
  };
  return { root, app, all };
}
function click(el) { assert.ok(el, 'button not found'); const handler = el.props.onClick; for (const fn of Array.isArray(handler) ? handler : [handler]) fn?.({ stopPropagation() {}, preventDefault() {} }); }
async function render(path, props) {
  const app = Vue.createSSRApp(component(path), props);
  for (const [name, stub] of Object.entries(vuetifyStubs())) app.component(name, stub);
  return renderToString(app);
}
test('country preview reuses real community map statistics without requesting country detail', async () => {
  const html = await render('components/community/CommunityCountryPreview.vue', { country, statistics, year: 2026 });
  assert.match(html, /Japan/);
  assert.match(html, /18 voyageurs en 2026/);
  assert.match(html, /3 actuellement sur place/);
  assert.doesNotMatch(html, /4,6|notes/);
});

test('country panel renders real stats, PUBLIC trip data, signed covers, winner and author', async () => {
  const html = await render('components/community/CommunityCountryPanelContent.vue', { detail, loading: false, failed: false });
  assert.match(html, /42/);
  assert.match(html, /4,6/);
  assert.match(html, /8 notes publiques/);
  assert.match(html, /Tokyo spring/);
  assert.match(html, /real_traveler/);
  assert.match(html, /https:\/\/signed.test\/trip.jpg/);
  assert.match(html, /https:\/\/signed.test\/winner.jpg/);
  assert.match(html, /par @real_winner/);
  assert.doesNotMatch(html, /À propos|completion|review score/i);
});

test('country panel close action is accessible and emits close without owning map selection', () => {
  let closeCount = 0;
  const h = mount(component('components/community/CommunityCountryPanelContent.vue'), {
    detail, loading: false, failed: false,
  }, () => { closeCount++; });
  try {
    const close = h.all().find(el => el.props['aria-label'] === 'Fermer le panneau pays');
    click(close);
    assert.equal(closeCount, 1);
  } finally { h.app.unmount(); }
});

test('Community Explorer click state opens panel, requests detail once and preserves Country Focus on close', async () => {
  let detailRequests = 0;
  const source = readFileSync(new URL('../../app/components/community/CommunityExplorer.vue', import.meta.url), 'utf8');
  const { descriptor } = parse(source);
  const script = descriptor.scriptSetup.content.replace(/import[\s\S]*?from\s+["'][^"']+["'];/g, '');
  const exposed = ts.transpileModule(`(async () => { ${script}\n return { selectCountry, closeCountryPanel, setHoveredCountry, selectedIso3, panelIso3, hoveredIso3, panelDetail }; })()`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const scope = Vue.effectScope();
  const statePromise = scope.run(() => vm.runInNewContext(exposed, {
    ...Vue,
    AbortController,
    defineProps: () => ({ countries: [country], revision: 0 }),
    useRuntimeConfig: () => ({ public: { apiBase: 'https://api.test' } }),
    useAsyncData: async key => {
      const value = typeof key === 'string' ? key : key.value;
      return value === 'community-memories'
        ? { data: Vue.ref([]) }
        : { data: Vue.ref({ year: 2026, asOfDate: '2026-09-13', countries: [statistics] }),
            status: Vue.ref('success'), error: Vue.ref(null), refresh: async () => {} };
    },
    getCommunityStatistics: async () => ({ year: 2026, asOfDate: '2026-09-13', countries: [statistics] }),
    getCommunityCountryExplorer: async () => { detailRequests++; return detail; },
    getCountryMemories: async () => [],
    communityAppearances: () => ({}), isCommunityYear: value => value > 0, selectedFlows: () => [],
    onBeforeUnmount: () => {},
  }));
  const state = await statePromise;
  try {
    state.setHoveredCountry('JPN', null);
    assert.equal(state.hoveredIso3.value, 'JPN');
    assert.equal(detailRequests, 0);
    state.selectCountry('JPN');
    await Vue.nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(state.selectedIso3.value, 'JPN');
    assert.equal(state.panelIso3.value, 'JPN');
    assert.equal(state.panelDetail.value, detail);
    assert.equal(detailRequests, 1);
    state.closeCountryPanel();
    assert.equal(state.panelIso3.value, null);
    assert.equal(state.selectedIso3.value, 'JPN');
  } finally { scope.stop(); }
});

test('WorldMap preview responds to mouse and keyboard focus, never touch hover', async () => {
  const { geoNaturalEarth1, geoPath, geoGraticule10 } = await import('d3-geo');
  const mapSource = readFileSync(new URL('../../app/components/WorldMap.vue', import.meta.url), 'utf8');
  const { descriptor } = parse(mapSource);
  const script = descriptor.scriptSetup.content.replace(/import[\s\S]*?from\s+["'][^"']+["'];/g, '');
  const zoom = { exports: {} };
  const zoomSource = readFileSync(new URL('../../app/services/mapZoom.ts', import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(zoomSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, zoom);
  const source = ts.transpileModule(`(async () => { ${script}\n return { previewPointer, previewFocus, clearCountryHover }; })()`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const emitted = [];
  const state = await vm.runInNewContext(source, {
    ...Vue, ...zoom.exports, geoNaturalEarth1, geoPath, geoGraticule10,
    defineProps: () => ({ zoomable: false, selectedIso3: null, visitedIso3: [] }),
    defineEmits: () => (...args) => emitted.push(args),
    useAsyncData: async () => ({ data: Vue.ref({ features: [] }), error: Vue.ref(null), status: Vue.ref('success'), refresh() {} }),
    getWorldGeometry() {}, onBeforeUnmount() {},
  });
  state.previewPointer('JPN', { pointerType: 'touch', clientX: 30, clientY: 40 });
  assert.equal(emitted.length, 0);
  state.previewPointer('JPN', { pointerType: 'mouse', clientX: 30, clientY: 40 });
  state.previewFocus('ITA');
  state.clearCountryHover();
  assert.equal(JSON.stringify(emitted), JSON.stringify([
    ['hover-country', 'JPN', { clientX: 30, clientY: 40 }],
    ['hover-country', 'ITA', null],
    ['hover-country', null, null],
  ]));
});

test('missing memory and rating show no invented content; mobile panel uses Vuetify bottom sheet', async () => {
  const noMemory = { ...detail, stats: { ...detail.stats, averageRating: null, ratingCount: 0 }, recentTrips: [], memory: null };
  const emptyHtml = await render('components/community/CommunityCountryPanelContent.vue', { detail: noMemory, loading: false, failed: false });
  assert.match(emptyHtml, /Aucune note publique/);
  assert.match(emptyHtml, /Aucun voyage public/);
  assert.doesNotMatch(emptyHtml, /Souvenir de la communauté|@real_winner|4,6/);
  mobile = true;
  try {
    const html = await render('components/community/CommunityCountryPanel.vue', {
      open: true, country, detail, loading: false, failed: false,
    });
    assert.match(html, /bottom-sheet/);
    assert.match(html, /Tokyo spring/);
  } finally { mobile = false; }
});

test('Community Explorer and WorldMap compile as Vue components', () => {
  for (const path of ['components/community/CommunityExplorer.vue', 'components/WorldMap.vue']) {
    const { descriptor, errors } = parse(readFileSync(new URL(`../../app/${path}`, import.meta.url), 'utf8'));
    assert.deepEqual(errors, []);
    assert.doesNotThrow(() => compileScript(descriptor, { id: path, inlineTemplate: true }));
  }
});

test('API service calls only the existing community endpoint with an encoded country code', async () => {
  let request;
  const source = readFileSync(new URL('../../app/services/api/community.ts', import.meta.url), 'utf8');
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    module, exports: module.exports,
    $fetch: async (...args) => { request = args; return detail; },
  });
  const controller = new AbortController();
  const result = await module.exports.getCommunityCountryExplorer('https://api.test', 'JPN/x', controller.signal);
  assert.equal(result, detail);
  assert.equal(request[0], '/community/countries/JPN%2Fx');
  assert.equal(request[1].baseURL, 'https://api.test');
  assert.equal(request[1].signal, controller.signal);
  assert.equal(request[1].retry, 0);
});
