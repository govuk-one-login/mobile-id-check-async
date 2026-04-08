import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    setupFiles: ["dotenv/config", "testSetup.ts"],
    reporters: ["junit", "default"],
    coverage: {
      provider: "v8",
      include: ["**/*.ts"],
      exclude: [
        "**/types/*.ts",
        "**/tests/utils/**/*.ts",
        "**/testUtils/**/*.ts"
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
