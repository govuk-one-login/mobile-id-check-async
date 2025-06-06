import {
  KMSClient,
  KMSClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
  SignCommand,
} from "@aws-sdk/client-kms";
import { AwsStub, mockClient } from "aws-sdk-client-mock";
import { createKmsSignedJwt } from "./createKmsSignedJwt";
import { expect } from "@jest/globals";
import "../../../../../../tests/testUtils/matchers";
import { emptyFailure, Result, successResult } from "../../../../utils/result";
import { mockDerSignature } from "../../../../testUtils/unitTestData";
import { JwtPayload } from "../../../../types/jwt";
import { BiometricCredential } from "@govuk-one-login/mobile-id-check-biometric-credential";

describe("createKmsSignedJwt", () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let kmsMock: AwsStub<
    ServiceInputTypes,
    ServiceOutputTypes,
    KMSClientResolvedConfig
  >;
  let result: Result<string, void>;

  const mockKid = "mockKid";
  const mockPayload: JwtPayload = {
    iat: 123,
    iss: "mockIss",
    jti: "mockJti",
    nbf: 123,
    sub: "mockSub",
    vc: {} as BiometricCredential,
  };

  beforeEach(() => {
    kmsMock = mockClient(KMSClient);
    consoleDebugSpy = jest.spyOn(console, "debug");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      kmsMock.on(SignCommand).resolves({});

      await createKmsSignedJwt(mockKid, mockPayload);
    });

    it("Logs attempt at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_CREATE_SIGNED_JWT_ATTEMPT",
        data: {
          kid: mockKid,
        },
      });
    });
  });

  describe("Given there is an error when calling KMS", () => {
    const mockError = {
      name: "Error",
      location: "mockLocation",
      message: "mockKmsError",
      stack: undefined,
    };

    beforeEach(async () => {
      kmsMock.on(SignCommand).rejects(mockError);

      result = await createKmsSignedJwt(mockKid, mockPayload);
    });

    it("Logs the failed attempt", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_CREATE_SIGNED_JWT_FAILURE",
        error: mockError,
      });
    });

    it("Returns an emptyFailure", () => {
      expect(result).toEqual(emptyFailure());
    });
  });

  describe("Given the call to KMS is successful", () => {
    describe("Given response does not include a signature", () => {
      beforeEach(async () => {
        kmsMock.on(SignCommand).resolves({ KeyId: mockKid });

        result = await createKmsSignedJwt(mockKid, mockPayload);
      });

      it("Logs the error", () => {
        expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREATE_SIGNED_JWT_FAILURE",
          error: "No signature in response from KMS",
        });
      });

      it("Returns an emptyFailure", () => {
        expect(result).toEqual(emptyFailure());
      });
    });

    describe("Given response includes a signature", () => {
      beforeEach(async () => {
        kmsMock
          .on(SignCommand)
          .resolves({ KeyId: "mockKid", Signature: mockDerSignature });

        result = await createKmsSignedJwt(mockKid, mockPayload);
      });

      it("Logs success", () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREATE_SIGNED_JWT_SUCCESS",
        });
      });

      it("Returns successResult with signed JWT", () => {
        expect(result).toEqual(
          successResult(
            "eyJhbGciOiJFUzI1NiIsImtpZCI6Im1vY2tLaWQiLCJ0eXAiOiJKV1QifQ.eyJpYXQiOjEyMywiaXNzIjoibW9ja0lzcyIsImp0aSI6Im1vY2tKdGkiLCJuYmYiOjEyMywic3ViIjoibW9ja1N1YiIsInZjIjp7fX0.QkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkIkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJA",
          ),
        );
      });
    });
  });
});
