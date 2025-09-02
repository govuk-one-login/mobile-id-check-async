import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  invalidCreatedAt,
  mockSessionId,
  NOW_IN_MILLISECONDS,
  validCreatedAt,
  validMobileAppBiometricTokenSessionAttributes,
} from "../../../../testUtils/unitTestData";
import {
  emptySuccess,
  errorResult,
  successResult,
} from "../../../../utils/result";
import { SessionState } from "../../session";
import { GetSessionBiometricToken } from "./GetSessionBiometricToken";

describe("Biometric token get session operation", () => {
  let getSessionOperation: GetSessionBiometricToken;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    getSessionOperation = new GetSessionBiometricToken();
  });

  describe("Given I request the getSessionAttributesFromDynamoDbItem", () => {
    describe("Given a session attributes item was provided that does not include all BiometricTokenSessionAttributes properties", () => {
      it("Returns an emptyFailure", () => {
        const result = getSessionOperation.getSessionAttributesFromDynamoDbItem(
          marshall({
            sessionId: mockSessionId,
            sessionState: SessionState.AUTH_SESSION_CREATED,
          }),
        );

        expect(result).toEqual(
          errorResult({
            sessionAttributes: {
              sessionId: mockSessionId,
              sessionState: SessionState.AUTH_SESSION_CREATED,
            },
          }),
        );
      });
    });

    describe("Given a valid BiometricTokenSessionAttributes item was provided", () => {
      const validBiometricTokenSessionAttributesItem = marshall(
        validMobileAppBiometricTokenSessionAttributes,
      );

      it("Returns successResult with BiometricTokenSessionAttributes session attributes", () => {
        const result = getSessionOperation.getSessionAttributesFromDynamoDbItem(
          marshall(validMobileAppBiometricTokenSessionAttributes),
        );

        expect(result).toEqual(
          successResult(unmarshall(validBiometricTokenSessionAttributesItem)),
        );
      });
    });
  });

  describe("Session attribute validation", () => {
    describe("Given the session is in the wrong state", () => {
      const invalidSessionAttributesWrongSessionState = {
        createdAt: validCreatedAt,
        sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
      };

      it("Returns an error result with the invalid attribute", () => {
        const result = getSessionOperation.validateSession(
          invalidSessionAttributesWrongSessionState,
        );

        expect(result).toStrictEqual(
          errorResult({
            invalidAttributes: [
              { sessionState: SessionState.BIOMETRIC_SESSION_FINISHED },
            ],
          }),
        );
      });
    });

    describe("Given the session is too old", () => {
      const invalidSessionAttributesSessionTooOld = {
        sessionState: SessionState.AUTH_SESSION_CREATED,
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
        sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
        createdAt: invalidCreatedAt,
      };

      it("Returns an error result with all invalid attributes", () => {
        const result = getSessionOperation.validateSession(
          invalidSessionAttributesSessionTooOld,
        );

        expect(result).toStrictEqual(
          errorResult({
            invalidAttributes: [
              { sessionState: SessionState.BIOMETRIC_SESSION_FINISHED },
              { createdAt: invalidCreatedAt },
            ],
          }),
        );
      });
    });

    describe("Given the session is valid", () => {
      const validSessionAttributes = {
        sessionState: SessionState.AUTH_SESSION_CREATED,
        createdAt: validMobileAppBiometricTokenSessionAttributes.createdAt,
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
