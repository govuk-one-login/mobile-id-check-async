import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  mockSessionId,
  NOW_IN_MILLISECONDS,
  validBiometricTokenIssuedSessionAttributes,
} from "../../../../testUtils/unitTestData";
import {
  emptyFailure,
  emptySuccess,
  errorResult,
  successResult,
} from "../../../../utils/result";
import { TxMAEventGetSessionOperation } from "./TxmaEventGetSessionOperation";
import { SessionState } from "../../session";

describe("TxMA event", () => {
  let getSessionOperation: TxMAEventGetSessionOperation;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    getSessionOperation = new TxMAEventGetSessionOperation();
  });

  describe("When I request the DynamoDB command input", () => {
    it("Returns the appropriate GetItemCommand input", () => {
      const result = getSessionOperation.getDynamoDbGetCommandInput({
        tableName: "mock_table_name",
        keyValue: mockSessionId,
      });
      expect(result).toEqual({
        TableName: "mock_table_name",
        Key: { sessionId: marshall(mockSessionId) },
      });
    });
  });

  describe("When I request the getSessionAttributesFromDynamoDbItem", () => {
    describe("Given a session attributes item was provided that does not include all BiometricTokenIssuedSessionAttributes properties", () => {
      it("Returns an emptyFailure", () => {
        const result = getSessionOperation.getSessionAttributesFromDynamoDbItem(
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
        const result = getSessionOperation.getSessionAttributesFromDynamoDbItem(
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

  describe("Session attribute validation", () => {
    describe("Given the session is in the wrong state - sessionState = AUTH_SESSION_CREATED", () => {
      const invalidSessionAttributesWrongSessionState = {
        createdAt: 1704106860000, // 2024-01-01 11:01:00.000
        sessionState: SessionState.AUTH_SESSION_CREATED,
      };

      it("Return and error result with the invalid attribute", () => {
        const result = getSessionOperation.validateSession(
          invalidSessionAttributesWrongSessionState,
        );

        expect(result).toEqual(
          errorResult({
            invalidAttribute: {
              sessionState: SessionState.AUTH_SESSION_CREATED,
            },
          }),
        );
      });
    });

    describe("Given the session is too old", () => {
      const invalidSessionAttributesSessionTooOld = {
        sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
        createdAt: 1704106740000, // 2024-01-01 10:59:00.000
      };

      it("Return and error result with the invalid attribute", () => {
        const result = getSessionOperation.validateSession(
          invalidSessionAttributesSessionTooOld,
        );

        expect(result).toEqual(
          errorResult({
            invalidAttribute: { createdAt: 1704106740000 }, // 2024-01-01 10:59:00.000
          }),
        );
      });
    });

    describe("Given the session is valid", () => {
      const validSessionAttributes = {
        sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
        createdAt: validBiometricTokenIssuedSessionAttributes.createdAt,
      };

      it("Return and error result with the invalid attribute", () => {
        const result = getSessionOperation.validateSession(
          validSessionAttributes,
        );

        expect(result).toEqual(emptySuccess());
      });
    });
  });
});
