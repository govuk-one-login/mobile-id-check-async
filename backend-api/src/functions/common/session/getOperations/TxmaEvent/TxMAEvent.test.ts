import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  mockSessionId,
  NOW_IN_MILLISECONDS,
  validBiometricTokenIssuedSessionAttributes,
} from "../../../../testUtils/unitTestData";
import { emptyFailure, successResult } from "../../../../utils/result";
import { TxMAEvent } from "./TxMAEvent";
import { SessionState } from "../../session";

describe("BiometricTokenIssued", () => {
  let txmaEvent: TxMAEvent;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    txmaEvent = new TxMAEvent();
  });

  describe("When I request DynamoDB ExpressionAttributeNames", () => {
    it("Returns the appropriate ExpressionAttributeNames", () => {
      const result = txmaEvent.getDynamoDbExpressionAttributeNames();
      expect(result).toEqual({
        "#sessionState": "sessionState",
        "#createdAt": "createdAt",
      });
    });
  });

  describe("When I request DynamoDB ExpressionAttributeValues", () => {
    it("Returns the ExpressionAttributeValues with the correct session state", () => {
      const result = txmaEvent.getDynamoDbExpressionAttributeValues();
      expect(result).toEqual({
        ":sessionState": { S: SessionState.BIOMETRIC_TOKEN_ISSUED },
        ":validFrom": { N: "1704106800000" }, // 2024-01-01T11:00:00.000Z
      });
    });
  });

  describe("When I request DynamoDB ConditionExpression", () => {
    it("Returns the appropriate ConditionExpression string", () => {
      const result = txmaEvent.getDynamoDbKeyConditionExpression();
      expect(result).toEqual(
        "#sessionState = :sessionState and #createdAt >= :validFrom",
      );
    });
  });

  describe("When I request the getSessionAttributesFromDynamoDbItem", () => {
    describe("Given a session attributes item was provided that does not include all BiometricTokenIssuedSessionAttributes properties", () => {
      it("Returns an emptyFailure", () => {
        const result = txmaEvent.getSessionAttributesFromDynamoDbItem(
          marshall({
            sessionId: mockSessionId,
          }),
        );

        expect(result).toEqual(emptyFailure());
      });
    });

    describe("Given a valid BiometricTokenIssuedSessionAttributes item was provided", () => {
      const validBiometricTokenIssuedSessionAttributesItem = marshall(
        validBiometricTokenIssuedSessionAttributes,
      );

      it("Returns successResult with BiometricTokenIssuedSessionAttributes session attributes", () => {
        const result = txmaEvent.getSessionAttributesFromDynamoDbItem(
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
