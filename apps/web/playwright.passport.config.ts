import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig(base, {
  testMatch: ["passport.spec.ts", "explorer.spec.ts"],
  testIgnore: "**/unit/**",
  use: { baseURL: "http://localhost:3098" },
  webServer: {
    command: "npm run dev -- --port 3098",
    url: "http://localhost:3098",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NUXT_PUBLIC_SUPABASE_URL: "https://passport.supabase.co",
      NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-public-key",
      NUXT_PUBLIC_API_BASE: "http://localhost:3098/test-api",
    },
  },
});
