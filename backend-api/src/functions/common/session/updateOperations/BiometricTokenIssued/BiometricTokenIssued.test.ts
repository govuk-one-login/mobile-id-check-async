import { BiometricTokenIssued } from "./BiometricTokenIssued";
import { SessionState } from "../../session";

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
});
