import { expect } from "@jest/globals";

const toHaveBeenCalledWithLogFields = (
  consoleSpy: jest.SpyInstance,
  logFields: Record<string, unknown>,
) => {
  const messages = consoleSpy.mock.calls.map((args) => args[0]);
  const pass = messages.some((message) => {
    const messageAsObject = JSON.parse(message);
    return isSubsetOf(logFields, messageAsObject);
  });
  return {
    pass,
    message: pass
      ? () =>
          `Expected not to find any log messages matching the specified fields and values: ${JSON.stringify(
            logFields,
          )}`
      : () =>
          `Expected to find at least one log message matching the specified fields and values: ${JSON.stringify(
            logFields,
          )}`,
  };
};

function isSubsetOf(
  object: Record<string, unknown>,
  targetObject: Record<string, unknown>,
) {
  return Object.keys(object).every((key) =>
    deepEquals(object[key], targetObject[key]),
  );
}

function deepEquals(subject: unknown, target: unknown): boolean {
  return JSON.stringify(subject) === JSON.stringify(target);
}

expect.extend({
  toHaveBeenCalledWithLogFields,
});

declare module "expect" {
  interface Matchers<R> {
    toHaveBeenCalledWithLogFields(logFields: object): R;
  }
}
