export default {
  collectCoverage: true,
  coveragePathIgnorePatterns: ["/testUtils/", "/node-modules/"],
  preset: "ts-jest",
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "./results",
        outputName: "report.xml",
      },
    ],
  ],
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  verbose: true,
  clearMocks: true,
};

process.env.POWERTOOLS_DEV = "true";
process.env.AWS_LAMBDA_LOG_LEVEL = "DEBUG";
