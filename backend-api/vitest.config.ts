import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      exclude: ["**/testUtils/**", "**/node-modules/**"],
    },
    setupFiles: ["testSetup.ts"],
    environment: "node",
    include: ["**/*.test.ts"],
    clearMocks: true,
    reporters: [
      "default",
      [
        "junit",
        {
          outputFile: "./results/report.xml",
        },
      ],
    ],
  },
});

process.env.POWERTOOLS_DEV = "true";
process.env.AWS_LAMBDA_LOG_LEVEL = "DEBUG";
