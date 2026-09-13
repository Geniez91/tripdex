import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { parse, compileScript } from '@vue/compiler-sfc';
import * as Vue from 'vue';
import { renderToString } from 'vue/server-renderer';
import { loadDateUtility } from './date-helpers.mjs';

const require = createRequire(import.meta.url);
const country = { id: 'jp', iso2: 'JP', iso3: 'JPN', name: 'Japon' };
const contest = { id: 'real-contest', country, startsAt: '2026-09-12T00:00:00.000Z', endsAt: '2099-01-01T00:00:00.000Z',
  status: 'OPEN', acceptsEntries: true, winnerSubmissionId: null, totalVotes: 0, submissions: [] };
const tripActivity = { type: 'TRIP_LOGGED', activityDate: '2026-09-12T00:00:00.000Z',
  user: { username: 'traveler', avatarUrl: null }, trip: { id: 'real-trip', title: 'Mon Japon', countries: [country], cities: [],
    startDate: '2026-01-01T00:00:00.000Z', endDate: null, coverUrl: null, rating: null, durationDays: null, review: null } };
const memory = { countryCode: 'JPN', countryName: 'Japon', imageUrl: 'https://signed.test/winner.png',
  contestId: 'real-contest', winnerSubmissionId: 'winner', user: { username: 'winner', avatarUrl: null }, trip: { id: 'trip', title: 'Japan' } };

// Positioning/outside-click are delegated to Vuetify; this stub exercises the marker's controlled state.
const overlayStub = {
  props: ['modelValue'], emits: ['update:modelValue'],
  setup: (props, { slots, emit }) => () => Vue.h('overlay', {
    onOutside: () => emit('update:modelValue', false),
  }, props.modelValue ? slots.default?.() : []),
};
function component(path) {
  const source = readFileSync(new URL(`../../app/${path}`, import.meta.url), 'utf8');
  const { descriptor } = parse(source);
  const script = compileScript(descriptor, { id: path, inlineTemplate: true });
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(script.content, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, {
    module, exports: module.exports, ...Vue, setInterval, clearInterval, setTimeout, clearTimeout,
    useRuntimeConfig: () => ({ app: { baseURL: '/' } }),
    useAuth: () => ({ status: Vue.ref('anonymous') }),
    useTrips: () => ({ trips: Vue.ref([]), load: async () => [] }),
    require: name => {
      if (name.endsWith('.json')) return { default: require(name) };
      if (name === '~/utils/dates') return loadDateUtility();
      if (name.endsWith('.vue')) {
        const resolved = name.startsWith('~/') ? name.slice(2) : `${path.slice(0, path.lastIndexOf('/'))}/${name.replace('./', '')}`;
        return { default: component(resolved) };
      }
      return require(name);
    },
  });
  return module.exports.default;
}
async function render(path, props) {
  const app = Vue.createSSRApp(component(path), props);
  app.component('VOverlay', overlayStub);
  for (const name of ['VAvatar', 'VImg', 'VIcon', 'NuxtLink']) {
    app.component(name, { setup: (_, { slots }) => () => Vue.h('span', slots.default?.()) });
  }
  return renderToString(app);
}

test('TRIP_LOGGED dispatches to the existing trip presentation', async () => {
  // Arrange
  const activity = tripActivity;
  // Act
  const html = await render('components/community/CommunityActivityItem.vue', { activity });
  // Assert
  assert.match(html, /activity-card/);
  assert.match(html, /Mon Japon/);
  assert.match(html, /traveler/);
  assert.doesNotMatch(html, /contest-card/);
});
test('PHOTO_CONTEST_OPENED dispatches to the premium card with a neutral empty illustration', async () => {
  // Arrange
  const activity = { type: 'PHOTO_CONTEST_OPENED', activityDate: contest.startsAt, contest };
  // Act
  const html = await render('components/community/CommunityActivityItem.vue', { activity });
  // Assert
  assert.match(html, /contest-card/);
  assert.match(html, /SOUVENIR DE LA SEMAINE/);
  assert.match(html, /Japon/);
  assert.match(html, /Voir les photos et voter/);
  assert.match(html, /contest-placeholder/);
  assert.doesNotMatch(html, /contest-hero"><img|124 votes|memory-marker/);
});
test('the premium hero and vote count come only from candidate data', async () => {
  // Arrange
  const value = { ...contest, totalVotes: 3, submissions: [{ id: 'candidate', imageUrl: 'https://signed.test/candidate.png' }] };
  // Act
  const html = await render('components/community/CommunityPhotoContestCard.vue', { contest: value });
  // Assert
  assert.match(html, /https:\/\/signed.test\/candidate.png/);
  assert.match(html, /3 votes déjà exprimés/);
  assert.doesNotMatch(html, /contest-placeholder/);
});
test('only a genuine winner produces a postcard marker', async () => {
  // Arrange
  const props = { memory, anchor: [100, 200], zoom: 2 };
  // Act
  const html = await render('components/community/CommunityMemoryMarker.vue', props);
  const absent = await render('components/community/CommunityMemoryMarker.vue', { ...props, memory: { ...memory, winnerSubmissionId: null } });
  const unavailable = await render('components/community/CommunityMemoryMarker.vue', { ...props, memory: { ...memory, imageUrl: null } });
  // Assert
  assert.match(html, /memory-marker/);
  assert.match(html, /https:\/\/signed.test\/winner.png/);
  assert.match(html, /Japon — Souvenir de la semaine/);
  assert.doesNotMatch(absent, /<image|memory-marker/);
  assert.doesNotMatch(unavailable, /<image|memory-marker/);
});
test('compact marker contains a photo and accessible identity without permanent details', async () => {
  const html = await render('components/community/CommunityMemoryMarker.vue', { memory, anchor: [100, 200] });
  assert.match(html, /class="memory-photo"/);
  assert.match(html, /aria-label="Japon — Souvenir de la semaine — par @winner"/);
  assert.doesNotMatch(html, /memory-detail|memory-author|<p|<strong/);
});

test('open details contain country, label and the actual winner author', async () => {
  const html = await render('components/community/CommunityMemoryMarker.vue', {
    memory: { ...memory, user: { username: 'actual_winner' } }, anchor: [100, 200], active: true,
  });
  assert.match(html, /<strong>Japon/);
  assert.match(html, /<p>Souvenir de la semaine/);
  assert.match(html, /par @actual_winner/);
  assert.doesNotMatch(html, /votes|profile/);
});

test('photo, stem and anchor retain screen size across zoom, pan, focus and return world', async () => {
  for (const view of [{ anchor: [100, 200], zoom: 1 }, { anchor: [100, 200], zoom: 4 },
    { anchor: [320, 160], zoom: 24 }, { anchor: [100, 200], zoom: 1 }]) {
    const html = await render('components/community/CommunityMemoryMarker.vue', { memory, ...view });
    assert.ok(html.includes('translate(' + view.anchor[0] + ', ' + view.anchor[1] + ')'));
    assert.ok(html.includes('scale(' + 1 / view.zoom + ')'));
    assert.match(html, /<line x1="0" y1="-10" x2="0" y2="0"/);
    assert.match(html, /<circle r="2"/);
    assert.match(html, /width="56" height="44"/);
    assert.match(html, /#E8BA59/);
  }
});

function mountMarkers() {
  const node = tag => ({ tag, children: [], closest: () => undefined });
  const renderer = Vue.createRenderer({ createElement: node, createText: node, createComment: node,
    insert(el, parent) { el.parent = parent; parent.children.push(el); },
    remove(el) { el.parent.children = el.parent.children.filter(child => child !== el); },
    setText(el, text) { el.text = text; }, setElementText(el, text) { el.text = text; },
    parentNode: el => el.parent, nextSibling: () => null,
    patchProp: (el, key, _previous, value) => { el[key] = value; } });
  const active = Vue.ref(null);
  const camera = Vue.ref('world');
  const Marker = component('components/community/CommunityMemoryMarker.vue');
  const root = node('root');
  const app = renderer.createApp({ setup: () => () => Vue.h('div', ['JPN', 'ITA'].map(code => Vue.h(Marker, {
    memory: { ...memory, countryCode: code }, anchor: [100, 200], camera: camera.value,
    active: active.value === code,
    'onUpdate:active': value => { active.value = value ? code : active.value === code ? null : active.value; },
  }))) });
  app.component('VOverlay', overlayStub);
  app.mount(root);
  const find = (tag, el = root) => el.children.flatMap(child => [ ...(child.tag === tag ? [child] : []), ...find(tag, child) ]);
  return { app, active, camera, find };
}
for (const [name, handler, event] of [
  ['mouse hover', 'onPointerenter', { pointerType: 'mouse' }],
  ['keyboard focus', 'onFocus', {}],
  ['touch tap', 'onClick', { stopPropagation() { this.stopped = true; } }],
]) {
  test(name + ' opens details; Escape restores the compact marker', async () => {
    const h = mountMarkers();
    try {
      h.find('button')[0][handler](event);
      await Vue.nextTick();
      assert.equal(h.active.value, 'JPN');
      assert.equal(h.find('article').length, 1);
      const handlers = h.find('button')[0].onKeydown;
      for (const fn of Array.isArray(handlers) ? handlers : [handlers]) fn({ key: 'Escape', stopPropagation() {} });
      await Vue.nextTick();
      assert.equal(h.active.value, null);
      assert.equal(h.find('article').length, 0);
      assert.equal(h.find('button').length, 2);
    } finally { h.app.unmount(); }
  });
}
test('marker stops country gestures, keeps siblings and closes on camera changes or outside click', async () => {
  const h = mountMarkers();
  try {
    let stopped = 0;
    h.find('button')[0].onPointerdown({ stopPropagation() { stopped++; } });
    h.find('button')[0].onClick({ stopPropagation() { stopped++; } });
    await Vue.nextTick();
    assert.equal(stopped, 2);
    h.find('button')[1].onFocus();
    await Vue.nextTick();
    assert.equal(h.active.value, 'ITA');
    assert.equal(h.find('article').length, 1);
    assert.equal(h.find('button').length, 2);
    h.camera.value = 'pan';
    await Vue.nextTick();
    assert.equal(h.active.value, null);
    h.find('button')[0].onFocus();
    await Vue.nextTick();
    h.find('overlay')[0].onOutside();
    await Vue.nextTick();
    assert.equal(h.active.value, null);
  } finally { h.app.unmount(); }
});
test('touch pointer entry alone does not open details and leaving closes them', async () => {
  const h = mountMarkers();
  try {
    h.find('button')[0].onPointerenter({ pointerType: 'touch' });
    assert.equal(h.active.value, null);
    h.find('button')[0].onFocus();
    h.find('button')[0].onBlur();
    await new Promise(resolve => setTimeout(resolve, 220));
    assert.equal(h.active.value, null);
  } finally { h.app.unmount(); }
});
test('activity cache keys distinguish a trip from a contest with the same id', () => {
  // Arrange
  const context = { exports: {} };
  const source = readFileSync(new URL('../../app/services/communityActivity.ts', import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  // Act
  const tripKey = context.exports.communityActivityKey(tripActivity);
  const contestKey = context.exports.communityActivityKey({ type: 'PHOTO_CONTEST_OPENED', contest: { id: tripActivity.trip.id } });
  // Assert
  assert.notEqual(tripKey, contestKey);
});
test('contest detail and map composition compile as Vue components', () => {
  // Arrange
  const paths = ['pages/community/photo-contests/[id].vue', 'components/community/CommunityExplorer.vue', 'components/WorldMap.vue', 'components/community/CommunityActivityFeed.vue'];
  // Act / Assert
  for (const path of paths) {
    const { descriptor, errors } = parse(readFileSync(new URL(`../../app/${path}`, import.meta.url), 'utf8'));
    assert.deepEqual(errors, []);
    assert.doesNotThrow(() => compileScript(descriptor, { id: path, inlineTemplate: true }));
  }
});
