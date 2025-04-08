import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  invalidCreatedAt,
  mockSessionId,
  NOW_IN_MILLISECONDS,
  validBiometricSessionFinishedAttributes,
  validCreatedAt,
} from "../../../../testUtils/unitTestData";
import { GetSessionIssueBiometricCredential } from "./GetSessionIssueBiometricCredential";
import {
  BiometricSessionFinishedAttributes,
  SessionState,
} from "../../session";
import {
  emptySuccess,
  errorResult,
  Result,
  successResult,
} from "../../../../utils/result";
import {
  ValidateSessionErrorInvalidAttributesData,
  ValidateSessionErrorInvalidAttributeTypeData,
} from "../../SessionRegistry";

describe("Get Session - Issue Biometric Credential operation", () => {
  let getSessionOperation: GetSessionIssueBiometricCredential;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_IN_MILLISECONDS);
    getSessionOperation = new GetSessionIssueBiometricCredential();
  });

  describe("When I request the getSessionAttributesFromDynamoDbItem", () => {
    let result: Result<
      BiometricSessionFinishedAttributes,
      ValidateSessionErrorInvalidAttributeTypeData
    >;
    describe("Given a session attributes item was provided that does not include all BiometricSessionFinishedSessionAttributes properties", () => {
      beforeEach(() => {
        result = getSessionOperation.getSessionAttributesFromDynamoDbItem(
          marshall({
            sessionId: mockSessionId,
            sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
          }),
        );
      });
      it("Returns an errorResult", () => {
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
      beforeEach(() => {
        result = getSessionOperation.getSessionAttributesFromDynamoDbItem(
          marshall(validBiometricSessionFinishedAttributes),
        );
      });

      it("Returns successResult with BiometricSessionFinishedSessionAttributes session attributes", () => {
        expect(result).toEqual(
          successResult(
            unmarshall(validBiometricSessionFinishedAttributesItem),
          ),
        );
      });
    });
  });

  describe("Session attribute validation", () => {
    let result: Result<void, ValidateSessionErrorInvalidAttributesData>;
    describe("Given the session is in the wrong state", () => {
      describe.each([
        [SessionState.AUTH_SESSION_CREATED],
        [SessionState.AUTH_SESSION_ABORTED],
        [SessionState.BIOMETRIC_TOKEN_ISSUED],
      ])("Given session state is %s", (sessionState: SessionState) => {
        const invalidSessionAttributesWrongSessionState = {
          createdAt: validCreatedAt,
          sessionState,
        };
        beforeEach(() => {
          result = getSessionOperation.validateSession(
            invalidSessionAttributesWrongSessionState,
          );
        });

        it("Returns an error result with the invalid attribute", () => {
          expect(result).toStrictEqual(
            errorResult({
              invalidAttributes: [{ sessionState }],
            }),
          );
        });
      });
    });

    describe("Given the session is too old", () => {
      const invalidSessionAttributesSessionTooOld = {
        sessionState: SessionState.BIOMETRIC_SESSION_FINISHED,
        createdAt: invalidCreatedAt,
      };
      beforeEach(() => {
        result = getSessionOperation.validateSession(
          invalidSessionAttributesSessionTooOld,
        );
      });

      it("Returns an error result with the invalid attribute", () => {
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
      beforeEach(() => {
        result = getSessionOperation.validateSession(
          invalidSessionAttributesSessionTooOld,
        );
      });

      it("Returns an error result with all invalid attributes", () => {
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
      describe.each([
        [SessionState.BIOMETRIC_SESSION_FINISHED],
        [SessionState.RESULT_SENT],
      ])("Given session state is %s", (sessionState: SessionState) => {
        const validSessionAttributes = {
          sessionState,
          createdAt: validBiometricSessionFinishedAttributes.createdAt,
        };

        beforeEach(() => {
          result = getSessionOperation.validateSession(validSessionAttributes);
        });

        it("Returns an empty success result", () => {
          expect(result).toEqual(emptySuccess());
        });
      });
    });
  });
});
