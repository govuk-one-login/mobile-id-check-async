import { BiometricTokenIssued } from "./BiometricTokenIssued";
import { SessionState } from "../../session";
import { emptyFailure, successResult } from "../../../../utils/result";
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

  describe("When I request the getSessionAttributesFromDynamoDbItem", () => {
    describe("Given invalid session attributes item was provided", () => {
      it("Returns an emptyFailure", () => {
        const result =
          biometricTokenIssued.getSessionAttributesFromDynamoDbItem({});

        expect(result).toEqual(emptyFailure());
      });
    });

    describe("Given valid session attributes item was provided", () => {
      it("Returns successResult with valid session attributes", () => {
        const validSessionAttributes = {
          clientId: "mockClientId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          createdAt: 12345,
          issuer: "mockIssuer",
          sessionId: "mockSessionId",
          sessionState: SessionState.AUTH_SESSION_CREATED,
          clientState: "mockClientState",
          subjectIdentifier: "mockSubjectIdentifier",
          timeToLive: 12345,
        };
        const result =
          biometricTokenIssued.getSessionAttributesFromDynamoDbItem(
            marshall(validSessionAttributes),
          );

        expect(result).toEqual(successResult(validSessionAttributes));
      });
    });
  });
});
