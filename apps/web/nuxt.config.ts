import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
// Serve package SVGs as local assets, never inline the flag collection into JS/CSS.
const countryFlagsDirectory = join(
  dirname(require.resolve("svg-country-flags/package.json")),
  "svg",
);

export default defineNuxtConfig({
  nitro: {
    publicAssets: [{ dir: countryFlagsDirectory, baseURL: "/country-flags" }],
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["vuetify-nuxt-module"],
  css: ["~/assets/main.css"],
  runtimeConfig: {
    public: {
      apiBase: "http://localhost:3001",
      supabaseUrl: "",
      supabasePublishableKey: "",
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: "fr" },
      title: "TripDex — Votre carnet de voyage",
      meta: [
        {
          name: "description",
          content:
            "Gardez une trace de vos voyages et retrouvez les pays visités sur votre carte du monde.",
        },
      ],
    },
  },
});
