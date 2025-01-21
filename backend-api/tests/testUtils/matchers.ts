import { expect } from "@jest/globals";

const toHaveBeenCalledWithLogFields = function toHaveBeenCalledWithLogFields(
  consoleSpy: jest.SpyInstance,
  logFields: Record<string, unknown>,
) {
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

const toBeValidUuid = function toBeValidUuid(candidate: unknown) {
  const pass = isValidUuid(candidate);
  return {
    pass,
    message: pass
      ? () => `expected ${candidate} not to be a valid UUID`
      : () => `expected ${candidate} to be a valid UUID`,
  };
};

const isValidUuid = (candidate: unknown): boolean => {
  if (typeof candidate !== "string") return false;
  const regexUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regexUUID.test(candidate);
};

expect.extend({
  toHaveBeenCalledWithLogFields,
  toBeValidUuid,
});

declare module "expect" {
  interface AsymmetricMatchers {
    toBeValidUuid(): void;
  }
  interface Matchers<R> {
    toHaveBeenCalledWithLogFields(logFields: object): R;
    toBeValidUuid(): R;
  }
}
