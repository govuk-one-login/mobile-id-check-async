import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  mockSessionId,
  NOW_IN_MILLISECONDS,
  validAbortSessionAttributes,
  validBiometricTokenIssuedSessionAttributes,
  validBaseSessionAttributes,
  ONE_HOUR_AGO_IN_MILLISECONDS,
} from "../../../../testUtils/unitTestData";
import { errorResult, successResult } from "../../../../utils/result";
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
            createdAt > :oneHourAgoInMilliseconds`,
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
        ":oneHourAgoInMilliseconds": {
          N: ONE_HOUR_AGO_IN_MILLISECONDS.toString(),
        }, // Changed from S to N type
      });

      // Additional check to verify the oneHourAgoInMilliseconds value
      const oneHourAgoInMillisecondsValue = Number(
        result[":oneHourAgoInMilliseconds"].N,
      );
      expect(oneHourAgoInMillisecondsValue).toBe(Date.now() - 60 * 60 * 1000);
    });
  });

  describe("When I request the getSessionAttributesFromDynamoDbItem", () => {
    const validBiometricTokenIssuedSessionAttributesItem = marshall(
      validBiometricTokenIssuedSessionAttributes,
    );

    describe("Given operationFailed in options is true", () => {
      const getSessionAttributesOptions = { operationFailed: true };

      it("Returns an error result with invalid session attributes", () => {
        const result = abortSession.getSessionAttributesFromDynamoDbItem(
          marshall({ clientId: "mockClientId" }),
          getSessionAttributesOptions,
        );
        expect(result).toEqual(
          errorResult({
            sessionAttributes: {
              clientId: "mockClientId",
            },
          }),
        );
      });

      it("Returns successResult with BiometricTokenIssuedSessionAttributes for valid base attributes with BIOMETRIC_TOKEN_ISSUED state", () => {
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

      it("Returns successResult with BaseSessionAttributes for valid base attributes with AUTH_SESSION_CREATED state", () => {
        const baseSessionWithAuthCreatedState = {
          ...validBaseSessionAttributes,
          sessionState: SessionState.AUTH_SESSION_CREATED,
        };
        const baseSessionWithAuthCreatedStateItem = marshall(
          baseSessionWithAuthCreatedState,
        );

        const result = abortSession.getSessionAttributesFromDynamoDbItem(
          baseSessionWithAuthCreatedStateItem,
          getSessionAttributesOptions,
        );

        expect(result).toEqual(
          successResult(unmarshall(baseSessionWithAuthCreatedStateItem)),
        );
      });

      it("Returns successResult with BaseSessionAttributes for valid base attributes with another state", () => {
        const baseSessionWithRandomState = {
          ...validBaseSessionAttributes,
          sessionState: "SOME_OTHER_STATE",
        };
        const baseSessionWithRandomStateItem = marshall(
          baseSessionWithRandomState,
        );

        const result = abortSession.getSessionAttributesFromDynamoDbItem(
          baseSessionWithRandomStateItem,
          getSessionAttributesOptions,
        );

        expect(result).toEqual(
          successResult(unmarshall(baseSessionWithRandomStateItem)),
        );
      });
    });

    describe("Given operationFailed in options is falsy", () => {
      it("Returns error result with invalid session attributes", () => {
        const result = abortSession.getSessionAttributesFromDynamoDbItem(
          validBiometricTokenIssuedSessionAttributesItem,
        );
        expect(result).toEqual(
          errorResult({
            sessionAttributes: unmarshall(
              validBiometricTokenIssuedSessionAttributesItem,
            ),
          }),
        );
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
  });
});
