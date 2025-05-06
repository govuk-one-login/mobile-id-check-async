import { KMSClient, SignCommand } from "@aws-sdk/client-kms";
import { mockClient } from "aws-sdk-client-mock";
import { TokenService } from "../tokenService";
import { ErrorCategory } from "../../../utils/result";
import { mockDerSignature } from "../../../testUtils/unitTestData";

const kmsMock = mockClient(KMSClient);

describe("Token Service", () => {
  const payload = {
    aud: "https://mock.audience.com",
    iss: "https://mock.issuer.com",
    exp: 3600,
    scope: "mock.scope",
    client_id: "mockClientId",
  };
  let tokenService: TokenService;

  beforeEach(() => {
    tokenService = new TokenService("mockArn/mockKid");
  });

  afterEach(() => {
    kmsMock.reset();
  });

  describe("Given there is an error calling KMS", () => {
    it("Throws an error", async () => {
      kmsMock
        .on(SignCommand)
        .rejects(new Error("Mock failing to sign JWT error message"));

      const mintTokenResponse = tokenService.mintToken(payload);
      expect((await mintTokenResponse).isError).toBe(true);
      expect((await mintTokenResponse).value).toStrictEqual({
        errorMessage: "Error from KMS",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    });
  });

  describe("Given the request to KMS is successful", () => {
    describe("Given KMS response does not include Signature key", () => {
      it("Throws Failed to sign JWT with signature error", async () => {
        kmsMock.on(SignCommand).resolves({ KeyId: "mockKeyId" });

        const mintTokenResponse = tokenService.mintToken(payload);
        expect((await mintTokenResponse).isError).toBe(true);
        expect((await mintTokenResponse).value).toStrictEqual({
          errorMessage: "No signature in response from KMS",
          errorCategory: ErrorCategory.SERVER_ERROR,
        });
      });
    });

    describe("Given KMS provides a valid response", () => {
      it("Returns a token", async () => {
        kmsMock
          .on(SignCommand)
          .resolves({ KeyId: "mockKeyId", Signature: mockDerSignature });

        const result = await tokenService.mintToken(payload);

        expect(result.isError).toBe(false);
        expect(result.value).toEqual(
          "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1vY2tLaWQifQ.eyJhdWQiOiJodHRwczovL21vY2suYXVkaWVuY2UuY29tIiwiaXNzIjoiaHR0cHM6Ly9tb2NrLmlzc3Vlci5jb20iLCJleHAiOjM2MDAsInNjb3BlIjoibW9jay5zY29wZSIsImNsaWVudF9pZCI6Im1vY2tDbGllbnRJZCJ9.QkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkIkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJA",
        );
      });
    });
  });
});
