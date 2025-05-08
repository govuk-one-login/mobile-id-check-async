import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  mockSessionId,
  NOW_IN_MILLISECONDS,
  validBiometricSessionFinishedAttributes,
  validBiometricTokenIssuedSessionAttributes,
} from "../../../../testUtils/unitTestData";
import { errorResult, successResult } from "../../../../utils/result";
import { SessionState } from "../../session";
import { ResultSent } from "./ResultSent";

describe("ResultSent", () => {
  let resultSent: ResultSent;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    resultSent = new ResultSent(mockSessionId);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("When I request the DynamoDB UpdateExpression", () => {
    it("Returns the appropriate UpdateExpression string", () => {
      const result = resultSent.getDynamoDbUpdateExpression();
      expect(result).toEqual("set sessionState = :resultSent");
    });
  });

  describe("When I request the DynamoDB ConditionExpression", () => {
    it("Returns the appropriate ConditionExpression string", () => {
      const result = resultSent.getDynamoDbConditionExpression();
      expect(result).toEqual("attribute_exists(sessionId)");
    });
  });

  describe("When I request the ExpressionAttributeValues", () => {
    it("Returns the ExpressionAttributeValues with the correct values", () => {
      const result = resultSent.getDynamoDbExpressionAttributeValues();
      expect(result).toEqual({
        ":resultSent": {
          S: SessionState.RESULT_SENT,
        },
      });
    });
  });

  describe("When I request the getSessionAttributesFromDynamoDbItem", () => {
    const validBiometricTokenIssuedSessionAttributesItem = marshall(
      validBiometricTokenIssuedSessionAttributes,
    );

    describe("Given operationFailed in options is falsy", () => {
      it("Returns error result with with invalid session attributes", () => {
        const result = resultSent.getSessionAttributesFromDynamoDbItem(
          validBiometricTokenIssuedSessionAttributesItem,
        );
        expect(result).toEqual(
          errorResult({
            sessionAttributes: unmarshall(
              validBiometricTokenIssuedSessionAttributesItem,
            ),
          }),
        );
      });

      it("Returns successResult with BiometricSessionFinishedAttributes for valid attributes", () => {
        const validFinishedSessionAttributesItem = marshall(
          validBiometricSessionFinishedAttributes,
        );
        const result = resultSent.getSessionAttributesFromDynamoDbItem(
          validFinishedSessionAttributesItem,
        );
        expect(result).toEqual(
          successResult(unmarshall(validFinishedSessionAttributesItem)),
        );
      });
    });
  });
});
