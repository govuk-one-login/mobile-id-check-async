import { defineConfig } from "vitest/config";

const reportName = process.env.VITEST_JUNIT_FILE || "report.xml";
const reporters =
  process.env.GITHUB_ACTIONS === "true"
    ? ["default", "github-actions"]
    : ["default", "junit"];

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      ignoreEmptyLines: true,
      enabled: true,
      exclude: ["**/testUtils/**", "**/node-modules/**"],
      reporter: ["lcov", "text-summary"],
    },
    silent: "passed-only",
    setupFiles: ["testSetup.ts"],
    environment: "node",
    include: ["**/*.test.ts"],
    clearMocks: true,
    reporters,
    outputFile: {
      junit: `results/${reportName}`,
    },
  },
});

process.env.POWERTOOLS_DEV = "true";
process.env.AWS_LAMBDA_LOG_LEVEL = "DEBUG";
