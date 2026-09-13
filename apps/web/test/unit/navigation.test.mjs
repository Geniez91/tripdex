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
import * as Vue from 'vue';
import { createRouter, createMemoryHistory, RouterLink } from 'vue-router';
import { parse, compileScript } from '@vue/compiler-sfc';

const navigationSource = readFileSync(new URL('../../app/components/tripdex/AppNavigation.vue', import.meta.url), 'utf8');
const descriptor = parse(navigationSource).descriptor;
function navComponent(route) {
  const script = compileScript(descriptor, { id: 'navigation', inlineTemplate: true });
  const compiled = { exports: {} };
  vm.runInNewContext(ts.transpileModule(script.content, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, { module: compiled, exports: compiled.exports, ...Vue,
    require: name => name === 'vue' ? Vue : module.exports, useRoute: () => route });
  return compiled.exports.default;
}
async function mountNavigation(path = '/journal') {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', component: {} }, { path: '/journal', component: {} },
    { path: '/profile/map', component: {} }, { path: '/profile', component: {} },
  ] });
  await router.push(path); await router.isReady();
  const node = tag => ({ tag, children: [] });
  const renderer = Vue.createRenderer({ createElement: node, createText: node, createComment: node,
    insert(el, parent) { parent.children.push(el); }, remove() {}, parentNode: () => null, nextSibling: () => null,
    setText(el, value) { el.text = value; }, setElementText(el, value) { el.text = value; },
    patchProp(el, key, _previous, value) { el[key] = value; },
  });
  const route = Vue.reactive({ path: router.currentRoute.value.path });
  const stop = Vue.watch(router.currentRoute, value => { route.path = value.path; });
  const app = renderer.createApp(navComponent(route));
  app.use(router); app.component('NuxtLink', RouterLink);
  app.component('VIcon', { setup: () => () => Vue.h('i') });
  // Vuetify owns overlay positioning; exercise the activator binding contract here.
  app.component('VTooltip', { props: ['text', 'openOnFocus'], setup: (props, { slots }) => {
    const open = Vue.ref(false);
    return () => Vue.h('tooltip', [slots.activator({ props: {
      onFocus: () => { if (props.openOnFocus) open.value = true; },
      onMouseenter: () => { open.value = true; },
      onBlur: () => { open.value = false; },
    } }), open.value ? Vue.h('label', props.text) : null]);
  } });
  const root = node('root'); app.mount(root);
  const find = (tag, el = root) => el.children.flatMap(child => [...(child.tag === tag ? [child] : []), ...find(tag, child)]);
  return { router, find, dispose() { app.unmount(); stop(); } };
}
function click(link) {
  return link.onClick({ button: 0, defaultPrevented: false, preventDefault() {}, currentTarget: { getAttribute: () => null } });
}
test('global action is icon-only with an accessible name and the existing form target', async () => {
  const h = await mountNavigation();
  try {
    const action = h.find('a').find(a => a.class === 'navigation-action');
    assert.equal(action.href, '/#trip-form-title');
    assert.equal(action['aria-label'], 'Logger un voyage');
    assert.equal(action.children.some(child => child.tag === 'i'), true);
    assert.equal(action.children.some(child => child.text === 'Logger un voyage'), false);
    assert.equal(h.find('a').length, 5);
  } finally { h.dispose(); }
});
for (const interaction of ['desktop click', 'mobile tap']) {
  test(interaction + ' navigates to the same existing form without making plus an active section', async () => {
    const h = await mountNavigation();
    try {
      const action = h.find('a').find(a => a.class === 'navigation-action');
      await click(action); await Vue.nextTick();
      assert.equal(h.router.currentRoute.value.fullPath, '/#trip-form-title');
      assert.equal(action['aria-current'], 'false');
      assert.doesNotMatch(action.class, /is-active|router-link-active/);
      assert.equal(activeNavigation(h.router.currentRoute.value.path), 'explorer');
    } finally { h.dispose(); }
  });
}
for (const event of ['onFocus', 'onMouseenter']) {
  test(event + ' exposes the Logger un voyage tooltip through activator props', async () => {
    const h = await mountNavigation();
    try {
      h.find('a').find(a => a.class === 'navigation-action')[event](); await Vue.nextTick();
      assert.equal(h.find('label')[0].text, 'Logger un voyage');
    } finally { h.dispose(); }
  });
}
test('existing destination links and contextual CTAs are preserved', async () => {
  const h = await mountNavigation();
  try {
    assert.deepEqual(h.find('a').slice(0, 4).map(a => a.href), ['/', '/journal', '/profile/map', '/profile']);
    for (const link of h.find('a').slice(0, 4)) {
      await click(link); await Vue.nextTick();
      assert.equal(h.router.currentRoute.value.path, link.href);
    }
    const journal = readFileSync(new URL('../../app/pages/journal.vue', import.meta.url), 'utf8');
    const explorer = readFileSync(new URL('../../app/pages/index.vue', import.meta.url), 'utf8');
    assert.match(journal, /Ajouter au journal/);
    assert.match(journal, /Enregistrer un premier voyage/);
    assert.match(explorer, /href="#trip-form-title"[\s\S]*?Logger un voyage/);
  } finally { h.dispose(); }
});
test('mobile keeps the existing bottom bar and allocates a comfortable action target', () => {
  const css = descriptor.styles[0].content;
  assert.match(css, /width: 44px/); assert.match(css, /height: 44px/);
  assert.match(css, /@media \(max-width: 959px\)/);
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) 52px/);
  assert.match(css, /safe-area-inset-bottom/);
});
