import { defineVuetifyConfiguration } from "vuetify-nuxt-module/custom-configuration";

// TripDex: marine structure, sea actions, warm surfaces and a restrained sun accent.
export default defineVuetifyConfiguration({
  icons: { defaultSet: "mdi" },
  theme: {
    defaultTheme: "tripdex",
    themes: {
      tripdex: {
        dark: false,
        colors: {
          primary: "#27677C",
          secondary: "#C88B3A",
          surface: "#FFFEFA",
          background: "#FAF3E3",
          ink: "#182C40",
          muted: "#596B74",
          sun: "#E8BA59",
          outline: "#D7DDD8",
          ocean: "#EAF2F3",
          "map-land": "#CFDAD9",
          "map-border": "#607A84",
          "map-visited": "#27677C",
          "map-selected": "#E8BA59",
          "on-sun": "#182C40",
          success: "#38654C",
          warning: "#8A601F",
          error: "#A43838",
          "on-surface": "#253B49",
          "on-background": "#253B49",
          "on-primary": "#FFFFFF",
        },
      },
    },
  },
  defaults: {
    VBtn: {
      rounded: "lg",
      elevation: 0,
      style: "text-transform: none; letter-spacing: normal",
    },
    VCard: { rounded: "lg", elevation: 0, border: true },
    VTextField: {
      variant: "outlined",
      color: "primary",
      density: "comfortable",
    },
    VSelect: { variant: "outlined", color: "primary", density: "comfortable" },
    VTextarea: {
      variant: "outlined",
      color: "primary",
      density: "comfortable",
    },
    VChip: { color: "secondary", rounded: "lg", size: "small" },
  },
});
