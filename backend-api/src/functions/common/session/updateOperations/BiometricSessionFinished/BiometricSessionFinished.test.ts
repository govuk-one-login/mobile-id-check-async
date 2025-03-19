import { BiometricSessionFinished } from "./BiometricSessionFinished";
import { SessionState } from "../../session";
import {
  emptyFailure,
  emptySuccess,
  errorResult,
  successResult,
} from "../../../../utils/result";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  NOW_IN_MILLISECONDS,
  validBiometricSessionFinishedAttributes,
  validBiometricTokenIssuedSessionAttributes,
} from "../../../../testUtils/unitTestData";

describe("BiometricSessionFinished", () => {
  let biometricSessionFinished: BiometricSessionFinished;
  const mockBiometricSessionId = "mock-biometric-session-id";

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    biometricSessionFinished = new BiometricSessionFinished(
      mockBiometricSessionId,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("When I request the DynamoDB UpdateExpression", () => {
    it("Returns the appropriate UpdateExpression string", () => {
      const result = biometricSessionFinished.getDynamoDbUpdateExpression();
      expect(result).toEqual(
        "set biometricSessionId = :biometricSessionId, sessionState = :biometricSessionFinished",
      );
    });
  });

  describe("When I request the DynamoDB ConditionExpression", () => {
    it("Returns the appropriate ConditionExpression string", () => {
      const result = biometricSessionFinished.getDynamoDbConditionExpression();
      expect(result).toEqual(
        "attribute_exists(sessionId) AND sessionState = :requiredState AND createdAt > :timeLimit",
      );
    });
  });

  describe("When I request the ExpressionAttributeValues", () => {
    it("Returns the ExpressionAttributeValues with the correct values", () => {
      const result =
        biometricSessionFinished.getDynamoDbExpressionAttributeValues();
      expect(result).toEqual({
        ":biometricSessionId": { S: mockBiometricSessionId },
        ":biometricSessionFinished": {
          S: SessionState.BIOMETRIC_SESSION_FINISHED,
        },
        ":requiredState": { S: SessionState.BIOMETRIC_TOKEN_ISSUED },
        ":timeLimit": { N: expect.any(String) }, // Changed from S to N type
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
        const result =
          biometricSessionFinished.getSessionAttributesFromDynamoDbItem(
            marshall({ clientId: "mockClientId" }),
            getSessionAttributesOptions,
          );
        expect(result).toEqual(emptyFailure());
      });

      it("Returns successResult with BaseSessionAttributes for valid base attributes", () => {
        const result =
          biometricSessionFinished.getSessionAttributesFromDynamoDbItem(
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
        const result =
          biometricSessionFinished.getSessionAttributesFromDynamoDbItem(
            validBiometricTokenIssuedSessionAttributesItem,
          );
        expect(result).toEqual(emptyFailure());
      });

      it("Returns successResult with BiometricSessionFinishedAttributes for valid attributes", () => {
        const validFinishedSessionAttributesItem = marshall(
          validBiometricSessionFinishedAttributes,
        );
        const result =
          biometricSessionFinished.getSessionAttributesFromDynamoDbItem(
            validFinishedSessionAttributesItem,
          );
        expect(result).toEqual(
          successResult(unmarshall(validFinishedSessionAttributesItem)),
        );
      });
    });

    describe("Given undefined item", () => {
      it("Returns emptyFailure", () => {
        const result =
          biometricSessionFinished.getSessionAttributesFromDynamoDbItem(
            undefined,
          );
        expect(result).toEqual(emptyFailure());
      });
    });
  });

  describe("Session attribute validation", () => {
    describe("Given the session is in the wrong state - sessionState = AUTH_SESSION_CREATED", () => {
      const invalidSessionAttributesWrongSessionState = {
        createdAt: 1704106860000, // 2024-01-01 11:01:00.000
        sessionState: SessionState.AUTH_SESSION_CREATED,
      };

      it("Return and error result with the invalid attribute", () => {
        const result = biometricSessionFinished.validateSession(
          invalidSessionAttributesWrongSessionState,
        );

        expect(result).toEqual(
          errorResult({
            invalidAttribute: {
              sessionState: SessionState.AUTH_SESSION_CREATED,
            },
          }),
        );
      });
    });

    describe("Given the session is too old", () => {
      const invalidSessionAttributesSessionTooOld = {
        sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
        createdAt: 1704106740000, // 2024-01-01 10:59:00.000
      };

      it("Return and error result with the invalid attribute", () => {
        const result = biometricSessionFinished.validateSession(
          invalidSessionAttributesSessionTooOld,
        );

        expect(result).toEqual(
          errorResult({
            invalidAttribute: { createdAt: 1704106740000 }, // 2024-01-01 10:59:00.000
          }),
        );
      });
    });

    describe("Given the session is valid", () => {
      const validSessionAttributes = {
        sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
        createdAt: validBiometricTokenIssuedSessionAttributes.createdAt,
      };

      it("Return and error result with the invalid attribute", () => {
        const result = biometricSessionFinished.validateSession(
          validSessionAttributes,
        );

        expect(result).toEqual(emptySuccess());
      });
    });
  });
});
