import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { compileScript, parse } from "vue/compiler-sfc";
import * as Vue from "vue";
import ts from "typescript";
import { harness, sessionB } from "./auth-harness.mjs";

test("changing accounts destroys page-local private drafts in the actual app shell", async () => {
  // Arrange
  const h = harness();
  await h.auth.initialize();
  const source = readFileSync(
    new URL("../../app/app.vue", import.meta.url),
    "utf8",
  );
  const { descriptor } = parse(source);
  const script = compileScript(descriptor, {
    id: "audit-app",
    inlineTemplate: true,
  });
  const module = { exports: {}, require: () => Vue, useAuth: () => h.auth };
  vm.runInNewContext(
    ts.transpileModule(script.content, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    module,
  );
  const node = (text = "") => ({ text, children: [], parent: null });
  const renderer = Vue.createRenderer({
    createElement: () => node(),
    createText: node,
    createComment: node,
    setText: (element, text) => {
      element.text = text;
    },
    setElementText: (element, text) => {
      element.text = text;
      element.children = [];
    },
    patchProp: () => {},
    insert: (element, parent, anchor = null) => {
      element.parent = parent;
      const index = anchor ? parent.children.indexOf(anchor) : -1;
      if (index < 0) parent.children.push(element);
      else parent.children.splice(index, 0, element);
    },
    remove: (element) => {
      if (element.parent)
        element.parent.children.splice(
          element.parent.children.indexOf(element),
          1,
        );
    },
    parentNode: (element) => element.parent,
    nextSibling: (element) =>
      element.parent?.children[element.parent.children.indexOf(element) + 1] ??
      null,
  });
  let mounts = 0,
    unmounts = 0;
  const app = renderer.createApp(module.exports.default);
  app.component("NuxtPage", {
    setup() {
      const draft = Vue.ref(
        mounts++ === 0 ? "Private draft belonging to A" : "",
      );
      Vue.onUnmounted(() => {
        unmounts++;
      });
      return () => Vue.h("p", draft.value);
    },
  });
  app.component("NuxtLink", {
    setup:
      (_props, { slots }) =>
      () =>
        Vue.h("a", slots.default?.()),
  });
  app.component("NuxtRouteAnnouncer", { render: () => null });
  const root = node();
  app.mount(root);
  const content = (element) =>
    element.text + element.children.map(content).join("");
  assert.match(content(root), /Private draft belonging to A/);
  // Act
  h.emit("SIGNED_IN", sessionB);
  await Vue.nextTick();
  // Assert
  assert.doesNotMatch(content(root), /Private draft belonging to A/);
  assert.equal(mounts, 2);
  assert.equal(unmounts, 1);
  h.emit("SIGNED_OUT", null);
  app.unmount();
});
