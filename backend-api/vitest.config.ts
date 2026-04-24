import { defineConfig } from "vitest/config";

const reporters =
  process.env.GITHUB_ACTIONS === "true"
    ? ["default", "github-actions"]
    : ["default", "junit"];

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      enabled: true,
      exclude: ["**/testUtils/**", "**/node-modules/**"],
      reportOnFailure: true,
      reporter: ["lcov", "text-summary"],
    },
    silent: "passed-only",
    setupFiles: ["testSetup.ts"],
    environment: "node",
    include: ["**/*.test.ts"],
    clearMocks: true,
    reporters,
  },
});

process.env.POWERTOOLS_DEV = "true";
process.env.AWS_LAMBDA_LOG_LEVEL = "DEBUG";
