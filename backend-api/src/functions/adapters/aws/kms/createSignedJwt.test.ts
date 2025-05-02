import {
  KMSClient,
  KMSClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
  SignCommand,
} from "@aws-sdk/client-kms";
import { AwsStub, mockClient } from "aws-sdk-client-mock";
import { createSignedJwt } from "./createSignedJwt";
import { expect } from "@jest/globals";
import "../../../../../tests/testUtils/matchers";
import { emptyFailure, Result, successResult } from "../../../utils/result";

describe("createSignedJwt", () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let kmsMock: AwsStub<
    ServiceInputTypes,
    ServiceOutputTypes,
    KMSClientResolvedConfig
  >;
  let result: Result<string, void>;

  // This is a simulated, not cryptographically valid, DER-encoded signature
  const mockDerSignature = Buffer.from([
    48,
    69, // SEQUENCE
    2,
    33, // INTEGER (R)
    0x00, // Leading zero for R > 127
    ...Array(32).fill(0x42), // Mock R value
    2,
    32, // INTEGER (S)
    ...Array(32).fill(0x24), // Mock S value
  ]);
  const mockKidArn = "mockArn/mockKid";
  const mockPayload = {
    iat: 123,
    iss: "mockIss",
    jti: "mockJti",
    nbf: 123,
    sub: "mockSub",
    vc: "mockVc",
  };

  beforeEach(() => {
    kmsMock = mockClient(KMSClient);
    consoleDebugSpy = jest.spyOn(console, "debug");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  describe("On every invocation", () => {
    beforeEach(async () => {
      kmsMock.on(SignCommand).resolves({});

      await createSignedJwt(mockPayload, mockKidArn);
    });

    it("Logs attempt at debug level", () => {
      expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_CREATE_SIGNED_JWT_ATTEMPT",
        data: {
          kidArn: mockKidArn,
        },
      });
    });
  });

  describe("Given there is an error when calling KMS", () => {
    beforeEach(async () => {
      kmsMock.on(SignCommand).rejects("mockKmsError");

      result = await createSignedJwt(mockPayload, mockKidArn);
    });

    it("Logs the failed attempt", () => {
      expect(consoleErrorSpy).toHaveBeenCalledWithLogFields({
        messageCode: "MOBILE_ASYNC_CREATE_SIGNED_JWT_FAILURE",
      });
    });

    it("Returns an emptyFailure", () => {
      expect(result).toEqual(emptyFailure());
    });
  });

  describe("Given the call to KMS is successful", () => {
    describe("Given response does not include a signature", () => {
      beforeEach(async () => {
        kmsMock.on(SignCommand).resolves({ KeyId: "mockKid" });

        result = await createSignedJwt(mockPayload, mockKidArn);
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

    describe("Given response is valid", () => {
      beforeEach(async () => {
        kmsMock
          .on(SignCommand)
          .resolves({ KeyId: "mockKid", Signature: mockDerSignature });

        result = await createSignedJwt(mockPayload, mockKidArn);
      });

      it("Logs success", () => {
        expect(consoleDebugSpy).toHaveBeenCalledWithLogFields({
          messageCode: "MOBILE_ASYNC_CREATE_SIGNED_JWT_SUCCESS",
        });
      });

      it("Returns signed JWT", () => {
        expect(result).toEqual(
          successResult(
            "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1vY2tLaWQifQ.eyJpYXQiOjEyMywiaXNzIjoibW9ja0lzcyIsImp0aSI6Im1vY2tKdGkiLCJuYmYiOjEyMywic3ViIjoibW9ja1N1YiIsInZjIjoibW9ja1ZjIn0.QkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkIkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJA",
          ),
        );
      });
    });
  });
});
