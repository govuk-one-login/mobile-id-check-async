import { BiometricTokenIssued } from "./BiometricTokenIssued";
import { SessionState } from "../../session";
import { emptyFailure, successResult } from "../../../../utils/result";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

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
    const validBaseSessionAttributesItem = marshall({
      clientId: "mockClientId",
      govukSigninJourneyId: "mockGovukSigninJourneyId",
      createdAt: 12345,
      issuer: "mockIssuer",
      sessionId: "mockSessionId",
      sessionState: SessionState.AUTH_SESSION_CREATED,
      clientState: "mockClientState",
      subjectIdentifier: "mockSubjectIdentifier",
      timeToLive: 12345,
    });

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
        const validBiometricTokenIssuedSessionAttributesItem = marshall({
          clientId: "mockClientId",
          govukSigninJourneyId: "mockGovukSigninJourneyId",
          createdAt: 12345,
          issuer: "mockIssuer",
          sessionId: "mockSessionId",
          sessionState: SessionState.AUTH_SESSION_CREATED,
          clientState: "mockClientState",
          subjectIdentifier: "mockSubjectIdentifier",
          timeToLive: 12345,
          documentType: "NFC_PASSPORT",
          opaqueId: "mockOpaqueId",
        });

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
});
