import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  invalidCreatedAt,
  mockSessionId,
  NOW_IN_MILLISECONDS,
  validBiometricTokenIssuedSessionAttributes,
  validCreatedAt,
} from "../../../../testUtils/unitTestData";
import {
  emptySuccess,
  errorResult,
  successResult,
} from "../../../../utils/result";
import { SessionState } from "../../session";
import { GetSessionBiometricTokenIssued } from "./GetSessionBiometricTokenIssued";

describe("TxMA event get session operation", () => {
  let getSessionOperation: GetSessionBiometricTokenIssued;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    getSessionOperation = new GetSessionBiometricTokenIssued();
  });

  describe("When I request the DynamoDB command input", () => {
    it("Returns the appropriate GetItemCommand input", () => {
      const result = getSessionOperation.getDynamoDbGetCommandInput({
        tableName: "mock_table_name",
        keyValue: mockSessionId,
      });
      expect(result).toEqual({
        TableName: "mock_table_name",
        Key: { sessionId: { S: mockSessionId } },
      });
    });
  });

  describe("When I request the getSessionAttributesFromDynamoDbItem", () => {
    describe("Given a session attributes item was provided that does not include all BiometricTokenIssuedSessionAttributes properties", () => {
      it("Returns an emptyFailure", () => {
        const result = getSessionOperation.getSessionAttributesFromDynamoDbItem(
          marshall({
            sessionId: mockSessionId,
            sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
          }),
        );

        expect(result).toEqual(
          errorResult({
            sessionAttributes: {
              sessionId: mockSessionId,
              sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
            },
          }),
        );
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
        createdAt: validCreatedAt,
        sessionState: SessionState.AUTH_SESSION_CREATED,
      };

      it("Returns an error result with the invalid attribute", () => {
        const result = getSessionOperation.validateSession(
          invalidSessionAttributesWrongSessionState,
        );

        expect(result).toEqual(
          errorResult({
            invalidAttributes: {
              sessionState: SessionState.AUTH_SESSION_CREATED,
            },
          }),
        );
      });
    });

    describe("Given the session is too old", () => {
      const invalidSessionAttributesSessionTooOld = {
        sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
        createdAt: invalidCreatedAt,
      };

      it("Returns an error result with the invalid attribute", () => {
        const result = getSessionOperation.validateSession(
          invalidSessionAttributesSessionTooOld,
        );

        expect(result).toEqual(
          errorResult({
            invalidAttributes: { createdAt: invalidCreatedAt },
          }),
        );
      });
    });

    describe("Given the session has multiple invalid attributes", () => {
      const invalidSessionAttributesSessionTooOld = {
        sessionState: SessionState.AUTH_SESSION_CREATED,
        createdAt: invalidCreatedAt,
      };

      it("Returns an error result with all invalid attributes", () => {
        const result = getSessionOperation.validateSession(
          invalidSessionAttributesSessionTooOld,
        );

        expect(result).toEqual(
          errorResult({
            invalidAttributes: {
              sessionState: SessionState.AUTH_SESSION_CREATED,
              createdAt: invalidCreatedAt,
            },
          }),
        );
      });
    });

    describe("Given the session is valid", () => {
      const validSessionAttributes = {
        sessionState: SessionState.BIOMETRIC_TOKEN_ISSUED,
        createdAt: validBiometricTokenIssuedSessionAttributes.createdAt,
      };

      it("Returns an empty success result", () => {
        const result = getSessionOperation.validateSession(
          validSessionAttributes,
        );

        expect(result).toEqual(emptySuccess());
      });
    });
  });
});
