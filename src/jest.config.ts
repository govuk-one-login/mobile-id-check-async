export default {
  collectCoverage: true,
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
  verbose: true,
};
