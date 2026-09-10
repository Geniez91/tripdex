import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testIgnore: ["**/unit/**", "**/passport.spec.ts", "**/explorer.spec.ts"],
  outputDir: "../../artifacts/playwright",
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: process.env.WEB_TEST_URL ?? "http://localhost:3000",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
});
