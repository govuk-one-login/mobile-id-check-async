import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  mockSessionId,
  NOW_IN_MILLISECONDS,
  validBiometricTokenIssuedSessionAttributes,
} from "../../../../testUtils/unitTestData";
import { emptyFailure, successResult } from "../../../../utils/result";
import { TxMAEvent } from "./TxMAEvent";

describe("TxMA event", () => {
  let txmaEvent: TxMAEvent;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    txmaEvent = new TxMAEvent();
  });

  describe("When I request the DynamoDB Key Expression", () => {
    it("Returns the appropriate Key Expression string", () => {
      const result = txmaEvent.getDynamoDbKeyExpression(mockSessionId);
      expect(result).toEqual({
        Key: { sessionId: marshall(mockSessionId) },
      });
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
          marshall(validBiometricTokenIssuedSessionAttributes),
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
