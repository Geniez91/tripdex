import { defineConfig } from "@playwright/test";
import base from "./playwright.passport.config";

export default defineConfig(base, {
  testMatch: ["community.spec.ts", "explorer.spec.ts", "passport.spec.ts"],
  testIgnore: "**/unit/**",
  outputDir: "../../artifacts/m4-increment2/playwright",
});
