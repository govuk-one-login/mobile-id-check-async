import { BiometricTokenIssued } from "./BiometricTokenIssued";
import { SessionState } from "../../session";
import { marshall } from "@aws-sdk/util-dynamodb";

describe("BiometricTokenIssued", () => {
  let biometricTokenIssued: BiometricTokenIssued;

  beforeEach(() => {
    biometricTokenIssued = new BiometricTokenIssued(
      "NFC_PASSPORT",
      "mockOpaqueId",
    );
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

  describe("When I request the ReturnValues", () => {
    it("Returns the ReturnValues with ALL_NEW", () => {
      const result = biometricTokenIssued.getDynamoDbReturnValues();
      expect(result).toEqual("ALL_NEW");
    });
  });

  describe("When I request the ReturnValuesOnConditionCheckFailure", () => {
    it("Returns the ReturnValuesOnConditionCheckFailure with ALL_OLD", () => {
      const result =
        biometricTokenIssued.getDynamoDbReturnValuesOnConditionCheckFailure();
      expect(result).toEqual("ALL_OLD");
    });
  });

  describe("When I request the getSessionAttributes", () => {
    describe("Given an invalid base session attribute record", () => {
      it("Returns BaseSessionAttributes", () => {
        const result = biometricTokenIssued.getSessionAttributes(
          marshall({
            clientId: "mockClientId",
          }),
        );
        expect(result).toEqual(null);
      });
    });

    describe("Given a valid base session attribute record", () => {
      it("Returns BaseSessionAttributes", () => {
        const validBaseSessionAttributes = {
          clientId: "mockClientId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          createdAt: 12345,
          issuer: "mockIssuer",
          sessionId: "mockSessionId",
          sessionState: "mockSessionState",
          clientState: "mockClientState",
          subjectIdentifier: "mockSubjectIdentifier",
          timeToLive: 12345,
          redirectUri: "https://www.mockRedirectUri.com",
        };

        const result = biometricTokenIssued.getSessionAttributes(
          validBaseSessionAttributes,
        );
        expect(result).toEqual(validBaseSessionAttributes);
      });
    });
  });
});
