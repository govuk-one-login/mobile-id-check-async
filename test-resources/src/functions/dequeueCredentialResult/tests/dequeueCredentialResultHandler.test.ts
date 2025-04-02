import { expect } from "@jest/globals";
import "../../../../tests/utils/matchers";
import { SQSEvent } from "aws-lambda";
import "aws-sdk-client-mock-jest";
import { NOW_IN_MILLISECONDS } from "../../../../tests/utils/unitTestData";
import { buildLambdaContext } from "../../testUtils/mockContext";
import {
  IDequeueCredentialResultDependencies,
  lambdaHandlerConstructor,
} from "../dequeueCredentialResultHandler";
import { passingSQSRecord } from "./testData";

describe("Dequeue credential result", () => {
  let dependencies: IDequeueCredentialResultDependencies;
  const env = {};
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    dependencies = {
      env,
    };
    consoleInfoSpy = jest.spyOn(console, "info");
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("Happy path", () => {
    describe("Given the Lambda is triggered", () => {
      beforeEach(async () => {
        const event: SQSEvent = {
          Records: [passingSQSRecord],
        };
        await lambdaHandlerConstructor(
          dependencies,
          event,
          buildLambdaContext(),
        );
      });

      it("Logs STARTED", async () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          message: "STARTED",
        });
      });

      it("Logs COMPLETED", async () => {
        expect(consoleInfoSpy).toHaveBeenCalledWithLogFields({
          message: "COMPLETED",
        });
      });
    });
  });
});
