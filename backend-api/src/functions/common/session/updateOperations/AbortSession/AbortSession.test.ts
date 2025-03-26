import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  mockSessionId,
  NOW_IN_MILLISECONDS,
  validAbortSessionAttributes,
  validBiometricTokenIssuedSessionAttributes,
} from "../../../../testUtils/unitTestData";
import { emptyFailure, successResult } from "../../../../utils/result";
import { SessionState } from "../../session";
import { AbortSession } from "./AbortSession";

describe("AbortSession", () => {
  let abortSession: AbortSession;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    abortSession = new AbortSession(mockSessionId);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("When I request the DynamoDB UpdateExpression", () => {
    it("Returns the appropriate UpdateExpression string", () => {
      const result = abortSession.getDynamoDbUpdateExpression();
      expect(result).toEqual("set sessionState = :abortedState");
    });
  });

  describe("When I request the DynamoDB ConditionExpression", () => {
    it("Returns the appropriate ConditionExpression string", () => {
      const result = abortSession.getDynamoDbConditionExpression();
      expect(result).toEqual(
        `attribute_exists(sessionId) AND 
            (sessionState = :authCreatedState OR sessionState = :biometricTokenIssuedState) AND 
            createdAt > :timeLimit`,
      );
    });
  });

  describe("When I request the ExpressionAttributeValues", () => {
    it("Returns the ExpressionAttributeValues with the correct values", () => {
      const result = abortSession.getDynamoDbExpressionAttributeValues();
      expect(result).toEqual({
        ":abortedState": {
          S: SessionState.AUTH_SESSION_ABORTED,
        },
        ":authCreatedState": { S: SessionState.AUTH_SESSION_CREATED },
        ":biometricTokenIssuedState": {
          S: SessionState.BIOMETRIC_TOKEN_ISSUED,
        },
        ":timeLimit": { N: expect.any(String) },
      });

      // Additional check to verify the timeLimit value
      const timeLimitValue = Number(result[":timeLimit"].N);
      expect(timeLimitValue).toBe(Date.now() - 60 * 60 * 1000);
    });
  });

  describe("When I request the getSessionAttributesFromDynamoDbItem", () => {
    const validBiometricTokenIssuedSessionAttributesItem = marshall(
      validBiometricTokenIssuedSessionAttributes,
    );

    describe("Given operationFailed in options is true", () => {
      const getSessionAttributesOptions = { operationFailed: true };

      it("Returns an emptyFailure for invalid base attributes", () => {
        const result = abortSession.getSessionAttributesFromDynamoDbItem(
          marshall({ clientId: "mockClientId" }),
          getSessionAttributesOptions,
        );
        expect(result).toEqual(emptyFailure());
      });

      it("Returns successResult with BaseSessionAttributes for valid base attributes", () => {
        const result = abortSession.getSessionAttributesFromDynamoDbItem(
          validBiometricTokenIssuedSessionAttributesItem,
          getSessionAttributesOptions,
        );
        expect(result).toEqual(
          successResult(
            unmarshall(validBiometricTokenIssuedSessionAttributesItem),
          ),
        );
      });
    });

    describe("Given operationFailed in options is falsy", () => {
      it("Returns emptyFailure for invalid finished session attributes", () => {
        const result = abortSession.getSessionAttributesFromDynamoDbItem(
          validBiometricTokenIssuedSessionAttributesItem,
        );
        expect(result).toEqual(emptyFailure());
      });

      it("Returns successResult with AbortSessionAttributes for valid attributes", () => {
        const validAbortSessionAttributesItem = marshall(
          validAbortSessionAttributes,
        );
        const result = abortSession.getSessionAttributesFromDynamoDbItem(
          validAbortSessionAttributesItem,
        );
        expect(result).toEqual(
          successResult(unmarshall(validAbortSessionAttributesItem)),
        );
      });
    });

    describe("Given undefined item", () => {
      it("Returns emptyFailure", () => {
        const result =
          abortSession.getSessionAttributesFromDynamoDbItem(undefined);
        expect(result).toEqual(emptyFailure());
      });
    });
  });
});
