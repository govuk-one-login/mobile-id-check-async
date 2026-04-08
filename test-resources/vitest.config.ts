import { defineConfig } from "vitest/config";

const reportName = process.env.VITEST_JUNIT_FILE || "report.xml";
const reporters =
  process.env.GITHUB_ACTIONS === "true"
    ? ["default", "github-actions"]
    : ["default", "junit"];

export default defineConfig({
  test: {
    silent: "passed-only",
    include: ["**/*.test.ts"],
    setupFiles: ["dotenv/config", "testSetup.ts"],
    reporters,
    outputFile: {
      junit: `results/${reportName}`,
    },
    coverage: {
      provider: "v8",
      include: ["**/*.ts"],
      exclude: [
        "**/tests/api-tests/**/*.ts",
        "**/tests/infrastructure-tests/**/*.ts",
        "**/src/functions/testUtils/**/*.ts",
      ],
      reportsDirectory: "coverage",
      enabled: true,
      reportOnFailure: true,
      reporter: ["lcov", "text-summary"],
    },
    environment: "node",
    clearMocks: true,
  },
});

process.env.POWERTOOLS_DEV = "true";
process.env.AWS_LAMBDA_LOG_LEVEL = "DEBUG";
