// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/main.css"],
  runtimeConfig: {
    public: { apiBase: "http://localhost:3001" },
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
