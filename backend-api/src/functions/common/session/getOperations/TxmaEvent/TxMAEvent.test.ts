import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  mockSessionId,
  NOW_IN_MILLISECONDS,
  validBiometricTokenIssuedSessionAttributes,
} from "../../../../testUtils/unitTestData";
import { emptyFailure, successResult } from "../../../../utils/result";
import { getValidFromTime, TxMAEvent } from "./TxMAEvent";
import { SessionState } from "../../session";

describe("TxMA Event", () => {
  let txmaEvent: TxMAEvent;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    txmaEvent = new TxMAEvent();
  });

  describe("When I request DynamoDB ExpressionAttributeValues", () => {
    it("Returns the ExpressionAttributeValues with the correct session state", () => {
      const result =
        txmaEvent.getDynamoDbExpressionAttributeValues(mockSessionId);
      expect(result).toEqual({
        ":sessionId": { S: mockSessionId },
        ":sessionState": { S: SessionState.BIOMETRIC_TOKEN_ISSUED },
        ":validFrom": { N: `${getValidFromTime()}` },
      });
    });
  });

  describe("When I request DynamoDB KeyConditionExpression", () => {
    it("Returns the appropriate KeyConditionExpression string", () => {
      const result = txmaEvent.getDynamoDbKeyConditionExpression();
      expect(result).toEqual("sessionId = :sessionId");
    });
  });

  describe("When I request DynamoDB FilterExpression", () => {
    it("Returns the appropriate FilterExpression string", () => {
      const result = txmaEvent.getDynamoDbFilterExpression();
      expect(result).toEqual(
        "sessionState = :sessionState and createdAt >= :validFrom",
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
