import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  NOW_IN_MILLISECONDS,
  ONE_HOUR_AGO_IN_MILLISECONDS,
  validBiometricSessionFinishedAttributes,
  validBiometricTokenIssuedSessionAttributes,
} from "../../../../testUtils/unitTestData";
import { errorResult, successResult } from "../../../../utils/result";
import { SessionState } from "../../session";
import { BiometricSessionFinished } from "./BiometricSessionFinished";

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
        "attribute_exists(sessionId) AND sessionState = :biometricTokenIssued AND createdAt > :oneHourAgoInMilliseconds",
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
        ":biometricTokenIssued": { S: SessionState.BIOMETRIC_TOKEN_ISSUED },
        ":oneHourAgoInMilliseconds": {
          N: ONE_HOUR_AGO_IN_MILLISECONDS.toString(),
        }, // Changed from S to N type
      });
    });
  });

  describe("When I request the getSessionAttributesFromDynamoDbItem", () => {
    const validBiometricTokenIssuedSessionAttributesItem = marshall(
      validBiometricTokenIssuedSessionAttributes,
    );

    describe("Given operationFailed in options is true", () => {
      const getSessionAttributesOptions = { operationFailed: true };

      it("Returns an error result with invalid attributes", () => {
        const result =
          biometricSessionFinished.getSessionAttributesFromDynamoDbItem(
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
      it("Returns error result with invalid finished session attributes", () => {
        const result =
          biometricSessionFinished.getSessionAttributesFromDynamoDbItem(
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
  });
});
