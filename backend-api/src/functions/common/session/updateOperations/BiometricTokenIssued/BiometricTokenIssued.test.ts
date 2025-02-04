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
      describe.each([
        {
          scenario: "Given attributes is an empty object",
          attributes: {},
        },
        {
          scenario: "Given attributes do not contain all required keys",
          attributes: { clientId: "mockClientId" },
        },
        {
          scenario:
            "Given mandatory attribute values are not all the correct type",
          attributes: {
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: "mockInvalidStringType",
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
            redirectUri: "https://www.mockRedirectUri.com",
          },
        },
        {
          scenario: "Given redirectUri is present but not of type string",
          attributes: {
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: 12345,
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
            redirectUri: [],
          },
        },
      ])("$scenario", (invalidBaseSession) => {
        it("Returns null", () => {
          const result = biometricTokenIssued.getSessionAttributes(
            marshall(invalidBaseSession.attributes),
          );
          expect(result).toEqual(null);
        });
      });
    });

    describe("Given a valid base session attribute record", () => {
      describe.each([
        {
          scenario: "Given redirectUri attribute is undefined",
          attributes: {
            clientId: "mockClientId",
            govukSigninJourneyId: "mockGovukSigninJourneyId",
            createdAt: 12345,
            issuer: "mockIssuer",
            sessionId: "mockSessionId",
            sessionState: "mockSessionState",
            clientState: "mockClientState",
            subjectIdentifier: "mockSubjectIdentifier",
            timeToLive: 12345,
          },
        },
        {
          scenario: "Given redirectUri attribute is defined",
          attributes: {
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
          },
        },
      ])("$scenario", (validBaseSession) => {
        it("Returns BaseSessionAttributes", () => {
          const validBaseSessionAttributesRecord = marshall(
            validBaseSession.attributes,
          );

          const result = biometricTokenIssued.getSessionAttributes(
            validBaseSessionAttributesRecord,
          );
          expect(result).toEqual(validBaseSession.attributes);
        });
      });
    });
  });
});
