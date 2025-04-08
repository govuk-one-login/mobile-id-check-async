import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  NOW_IN_MILLISECONDS,
  ONE_HOUR_AGO_IN_MILLISECONDS,
  validBaseSessionAttributes,
  validBiometricTokenIssuedSessionAttributes,
} from "../../../../testUtils/unitTestData";
import { errorResult, successResult } from "../../../../utils/result";
import { SessionState } from "../../session";
import { BiometricTokenIssued } from "./BiometricTokenIssued";

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
        "attribute_exists(sessionId) AND sessionState = :authSessionCreated AND createdAt > :oneHourAgoInMilliseconds",
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
        ":oneHourAgoInMilliseconds": {
          N: ONE_HOUR_AGO_IN_MILLISECONDS.toString(),
        },
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
        it("Returns an error result with session attributes", () => {
          const result =
            biometricTokenIssued.getSessionAttributesFromDynamoDbItem(
              marshall({
                clientId: "mockClientId",
              }),
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
        it("Returns an error result with session attributes", () => {
          const result =
            biometricTokenIssued.getSessionAttributesFromDynamoDbItem(
              validBaseSessionAttributesItem,
            );

          expect(result).toEqual(
            errorResult({
              sessionAttributes: unmarshall(validBaseSessionAttributesItem),
            }),
          );
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
});
