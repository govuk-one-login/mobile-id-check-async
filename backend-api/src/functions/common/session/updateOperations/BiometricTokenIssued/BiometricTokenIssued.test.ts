import { BiometricTokenIssued } from "./BiometricTokenIssued";
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
  validBaseSessionAttributes,
  validBiometricTokenIssuedSessionAttributes,
} from "../../../../testUtils/unitTestData";

describe("BiometricTokenIssued", () => {
  let biometricTokenIssued: BiometricTokenIssued;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    biometricTokenIssued = new BiometricTokenIssued(
      "NFC_PASSPORT",
      "mockOpaqueId",
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("When I request the DynamoDB UpdateExpression", () => {
    it("Returns the appropriate UpdateExpression string", () => {
      const result = biometricTokenIssued.getDynamoDbUpdateExpression();
      expect(result).toEqual(
        "set documentType = :documentType, opaqueId = :opaqueId, sessionState = :biometricTokenIssued",
      );
    });
  });

  describe("When I request the DynamoDB ConditionExpression", () => {
    it("Returns the appropriate ConditionExpression string", () => {
      const result = biometricTokenIssued.getDynamoDbConditionExpression();
      expect(result).toEqual(
        "attribute_exists(sessionId) AND sessionState in (:authSessionCreated)",
      );
    });
  });

  describe("When I request the ExpressionAttributeValues", () => {
    it("Returns the ExpressionAttributeValues with the correct session state", () => {
      const result =
        biometricTokenIssued.getDynamoDbExpressionAttributeValues();
      expect(result).toEqual({
        ":documentType": { S: "NFC_PASSPORT" },
        ":opaqueId": { S: "mockOpaqueId" },
        ":biometricTokenIssued": { S: SessionState.BIOMETRIC_TOKEN_ISSUED },
        ":authSessionCreated": { S: SessionState.AUTH_SESSION_CREATED },
      });
    });
  });

  describe("When I request the getSessionAttributesFromDynamoDbItem", () => {
    const validBaseSessionAttributesItem = marshall(validBaseSessionAttributes);

    describe("Given operationFailed in options is true", () => {
      const getSessionAttributesOptions = {
        operationFailed: true,
      };
      describe("Given a session attributes item was provided that does not include all BaseSessionAttributes properties", () => {
        it("Returns an emptyFailure", () => {
          const result =
            biometricTokenIssued.getSessionAttributesFromDynamoDbItem(
              marshall({
                clientId: "mockClientId",
              }),
              getSessionAttributesOptions,
            );

          expect(result).toEqual(emptyFailure());
        });
      });

      describe("Given a valid BaseSessionAttributes item was provided", () => {
        it("Returns successResult with BaseSessionAttributes session attributes", () => {
          const result =
            biometricTokenIssued.getSessionAttributesFromDynamoDbItem(
              validBaseSessionAttributesItem,
              getSessionAttributesOptions,
            );

          expect(result).toEqual(
            successResult(unmarshall(validBaseSessionAttributesItem)),
          );
        });
      });
    });

    describe("Given operationFailed in options is falsy", () => {
      describe("Given a session attributes item was provided that does not include all BiometricTokenIssuedSessionAttributes properties", () => {
        it("Returns an emptyFailure", () => {
          const result =
            biometricTokenIssued.getSessionAttributesFromDynamoDbItem(
              validBaseSessionAttributesItem,
            );

          expect(result).toEqual(emptyFailure());
        });
      });

      describe("Given valid BiometricTokenIssuedSessionAttributes item was provided", () => {
        const validBiometricTokenIssuedSessionAttributesItem = marshall(
          validBiometricTokenIssuedSessionAttributes,
        );

        it("Returns successResult with BiometricTokenIssuedSessionAttributes session attributes", () => {
          const result =
            biometricTokenIssued.getSessionAttributesFromDynamoDbItem(
              validBiometricTokenIssuedSessionAttributesItem,
            );

          expect(result).toEqual(
            successResult(
              unmarshall(validBiometricTokenIssuedSessionAttributesItem),
            ),
          );
        });
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
        const result = biometricTokenIssued.validateSession(
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
        sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
        createdAt: 1704106740000, // 2024-01-01 10:59:00.000
      };

      it("Return and error result with the invalid attribute", () => {
        const result = biometricTokenIssued.validateSession(
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
        sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
        createdAt: validBiometricTokenIssuedSessionAttributes.createdAt,
      };

      it("Return and error result with the invalid attribute", () => {
        const result = biometricTokenIssued.validateSession(
          validSessionAttributes,
        );

        expect(result).toEqual(emptySuccess());
      });
    });
  });
});
