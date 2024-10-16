import { IJwks, IPublicKeyGetter, PublicKeyGetter } from "../publicKeyGetter";
import { importJWK } from "jose";

describe("Public Key Getter", () => {
  let mockJwks: IJwks;
  let publicKeyGetter: IPublicKeyGetter;
  let mockSendHttpRequest;

  beforeEach(async () => {
    mockJwks = {
      keys: [
        {
          alg: "ES256",
          kid: "mockKid",
          kty: "EC",
          use: "sig",
          crv: "P-256",
          x: "NYmnFqCEFMVXQsmnSngTkiJK-Q9ixSBxLAXx6ZsBGlc",
          y: "9fpDnWl3rBP-T6z6e60Bmgym3ymjRK_VSdJ7wU_Nwvg",
        },
        {
          alg: "ES256",
          kid: "mockKid2",
          kty: "EC",
          use: "sig",
          crv: "P-256",
          x: "NYmnFqCEFMVXQsmnSngTkiJK-Q9ixSBxLAXx6ZsBGlc",
          y: "9fpDnWl3rBP-T6z6e60Bmgym3ymjRK_VSdJ7wU_Nwvg",
        },
      ],
    };
    mockSendHttpRequest = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify(mockJwks),
      headers: {
        "Cache-Control": "max-age=60",
      },
    });
    publicKeyGetter = new PublicKeyGetter({
      sendHttpRequest: mockSendHttpRequest,
    });
  });

  describe("Given a request error happens when tyring to get the JWKS", () => {
    it("Returns error result", async () => {
      mockSendHttpRequest = jest.fn().mockRejectedValueOnce("Some HTTP error");
      publicKeyGetter = new PublicKeyGetter({
        sendHttpRequest: mockSendHttpRequest,
      });
      const result = await publicKeyGetter.getPublicKey(
        "https://mockJwksEndpoint.com",
        "mockKid",
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error getting public key: Some HTTP error",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given there is no response body", () => {
    it("Returns error result", async () => {
      mockSendHttpRequest = jest.fn().mockResolvedValue({
        statusCode: 200,
        headers: {
          "Cache-Control": "max-age=60",
        },
      });
      publicKeyGetter = new PublicKeyGetter({
        sendHttpRequest: mockSendHttpRequest,
      });
      const result = await publicKeyGetter.getPublicKey(
        "https://mockJwksEndpoint.com",
        "mockKid",
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error getting public key: Error: Empty response body",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given the response does not contain valid JWKS", () => {
    it("Returns error result", async () => {
      mockSendHttpRequest = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify("notJson"),
        headers: {
          "Cache-Control": "max-age=60",
        },
      });
      publicKeyGetter = new PublicKeyGetter({
        sendHttpRequest: mockSendHttpRequest,
      });
      const result = await publicKeyGetter.getPublicKey(
        "https://mockJwksEndpoint.com",
        "mockKid",
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage:
          "Error getting public key: Error: Response does not match the expected JWKS structure",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given JWKS does not contain key matching provided key ID", () => {
    it("Returns error result", async () => {
      const result = await publicKeyGetter.getPublicKey(
        "https://mockJwksEndpoint.com",
        "unexpectedMockKid",
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage:
          "Error getting public key: Error: JWKS does not contain key matching provided key ID",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given converting JWK to a key object fails", () => {
    it("Returns error result", async () => {
      delete mockJwks.keys[0].crv;
      mockSendHttpRequest = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify(mockJwks),
        headers: {
          "Cache-Control": "max-age=60",
        },
      });
      publicKeyGetter = new PublicKeyGetter({
        sendHttpRequest: mockSendHttpRequest,
      });
      const result = await publicKeyGetter.getPublicKey(
        "https://mockJwksEndpoint.com",
        "mockKid",
      );

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage:
          'Error getting public key: TypeError [ERR_INVALID_ARG_TYPE]: The "key.crv" property must be of type string. Received undefined',
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given getting a matching public key is successful", () => {
    it("Returns the public key", async () => {
      const result = await publicKeyGetter.getPublicKey(
        "https://mockJwksEndpoint.com",
        "mockKid",
      );

      const expectedPublicKey = await importJWK(
        {
          alg: "ES256",
          kid: "mockKid",
          kty: "EC",
          use: "sig",
          crv: "P-256",
          x: "NYmnFqCEFMVXQsmnSngTkiJK-Q9ixSBxLAXx6ZsBGlc",
          y: "9fpDnWl3rBP-T6z6e60Bmgym3ymjRK_VSdJ7wU_Nwvg",
        },
        "ES256",
      );
      expect(result.isError).toBe(false);
      expect(result.value).toEqual(expectedPublicKey);
    });
  });
});
