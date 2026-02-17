import { expect } from "@jest/globals";
import { AssertionError, deepStrictEqual } from "node:assert";
import { SQSMessageBody } from "../../src/functions/adapters/aws/sqs/types";

const toHaveBeenCalledNthWithSqsMessage = (
  mockFn: jest.Mock,
  nthCall: number,
  expectedArguments: { sqsArn: string; expectedMessage: SQSMessageBody },
) => {
  if (nthCall < 1) {
    return {
      pass: false,
      message: () => "The nthCall parameter must be greater or equal to 1",
    };
  }

  const mockCalls = mockFn.mock.calls[nthCall - 1];
  if (mockCalls === undefined) {
    return {
      pass: false,
      message: () => `Only ${mockCalls.length} messages found.`,
    };
  }
  try {
    deepStrictEqual(mockCalls[0], expectedArguments.sqsArn);
    deepStrictEqual(mockCalls[1], expectedArguments.expectedMessage);
  } catch (error) {
    if (error instanceof AssertionError) {
      return { pass: false, message: () => error.message };
    }
    throw error;
  }
  return {
    pass: true,
    message: () =>
      "Expected not to find any Sqs messages matching these arguments",
  };
};

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
): boolean {
  return Object.keys(object).every((key) => {
    if (object[key] instanceof Object && targetObject[key] instanceof Object) {
      const objVal = object[key] as Record<string, unknown>;
      const targetObjVal = targetObject[key] as Record<string, unknown>;
      return isSubsetOf(objVal, targetObjVal);
    }
    return deepEquals(object[key], targetObject[key]);
  });
}

function deepEquals(subject: unknown, target: unknown): boolean {
  return JSON.stringify(subject) === JSON.stringify(target);
}

expect.extend({
  toHaveBeenCalledWithLogFields,
  toHaveBeenCalledNthWithSqsMessage,
});

declare module "expect" {
  interface Matchers<R> {
    toHaveBeenCalledWithLogFields(logFields: object): R;
    toHaveBeenCalledNthWithSqsMessage(
      nthCall: number,
      expectedArguments: { sqsArn: string; expectedMessage: SQSMessageBody },
    ): R;
  }
}
