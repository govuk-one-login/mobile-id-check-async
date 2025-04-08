import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  invalidCreatedAt,
  mockSessionId,
  NOW_IN_MILLISECONDS,
  validBiometricSessionFinishedAttributes,
  validCreatedAt,
} from "../../../../testUtils/unitTestData";
import { GetSessionIssueBiometricCredential } from "./GetSessionIssueBiometricCredential";
import { SessionState } from "../../session";
import {
  emptySuccess,
  errorResult,
  successResult,
} from "../../../../utils/result";

describe("Get Session - Issue Biometric Credential operation", () => {
  let getSessionOperation: GetSessionIssueBiometricCredential;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    getSessionOperation = new GetSessionIssueBiometricCredential();
  });

  describe("When I request the getSessionAttributesFromDynamoDbItem", () => {
    describe("Given a session attributes item was provided that does not include all BiometricSessionFinishedSessionAttributes properties", () => {
      it("Returns an emptyFailure", () => {
        const result = getSessionOperation.getSessionAttributesFromDynamoDbItem(
          marshall({
            sessionId: mockSessionId,
            sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
          }),
        );

        expect(result).toEqual(
          errorResult({
            sessionAttributes: {
              sessionId: mockSessionId,
              sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
            },
          }),
        );
      });
    });

    describe("Given a valid BiometricSessionFinishedSessionAttributes item was provided", () => {
      const validBiometricSessionFinishedAttributesItem = marshall(
        validBiometricSessionFinishedAttributes,
      );

      it("Returns successResult with BiometricSessionFinishedSessionAttributes session attributes", () => {
        const result = getSessionOperation.getSessionAttributesFromDynamoDbItem(
          marshall(validBiometricSessionFinishedAttributes),
        );

        expect(result).toEqual(
          successResult(
            unmarshall(validBiometricSessionFinishedAttributesItem),
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

        expect(result).toStrictEqual(
          errorResult({
            invalidAttributes: [
              { sessionState: SessionState.AUTH_SESSION_CREATED },
            ],
          }),
        );
      });
    });

    describe("Given the session is too old", () => {
      const invalidSessionAttributesSessionTooOld = {
        sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
        createdAt: invalidCreatedAt,
      };

      it("Returns an error result with the invalid attribute", () => {
        const result = getSessionOperation.validateSession(
          invalidSessionAttributesSessionTooOld,
        );

        expect(result).toStrictEqual(
          errorResult({
            invalidAttributes: [{ createdAt: invalidCreatedAt }],
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

        expect(result).toStrictEqual(
          errorResult({
            invalidAttributes: [
              { sessionState: SessionState.AUTH_SESSION_CREATED },
              { createdAt: invalidCreatedAt },
            ],
          }),
        );
      });
    });

    describe("Given the session is valid", () => {
      const validSessionAttributes = {
        sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
        createdAt: validBiometricSessionFinishedAttributes.createdAt,
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
