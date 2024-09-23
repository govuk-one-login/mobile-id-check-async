import { TokenEncrypter } from "../tokenEncrypter";

describe("Token Encrypter", () => {
  let tokenEncrypter: TokenEncrypter;

  const dummyJwt = "header.payload.signature";

  beforeEach(() => {
    tokenEncrypter = new TokenEncrypter("dummyJwksUrl");

    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        json: () =>
          Promise.resolve({
            keys: [
              {
                kty: "RSA",
                n: "0wLh4PMAjSt17zLNFw9nnBdV901AWp0uuHQzGaz1-Wz1lAs-jN7nI90sQAyiv8MDlYWLrfUZKcQAAA0yjISp9UyTr8qgqsyAKiFBIcnoH7l4qV-U-VXe3rcMjr5BzrKdVK664YiF9coGaal-QDDd1VY0fvvom3DhGnh8MoezBQPKl6pynIaSiDHZUdSe8B9LdsjsKHt4SujGRR_QlERYISC0s4pCQu2gA9qsP-pFDfcklbLtskFtWa_utiPe48Y5xgrhj5r-hMz9Zi4R55mX6nymC9gypk7q6iiXGEQcMzxPMy0kgF4437PqA-0GmjJE24pGmVhnr33UL2i0tsfviw",
                e: "AQAB",
                use: "enc",
                alg: "RS256",
                kid: "456d2da6-9ca8-4e1d-b8c8-081109d73015",
              },
            ],
          }),
      } as Response),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Given an error happens when requesting the JWKS", () => {
    it("Returns an error response", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 500,
          ok: false,
        } as Response),
      );

      const result = await tokenEncrypter.encrypt(dummyJwt);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error fetching JWKS",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given an unexpected network error happens when requesting the JWKS", () => {
    it("Returns an error response", async () => {
      jest.spyOn(global, "fetch").mockImplementationOnce(() => {
        throw new Error("Unexpected network error");
      });

      const result = await tokenEncrypter.encrypt(dummyJwt);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Unexpected network error fetching JWKS",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given the response body cannot be parsed as JSON", () => {
    it("Returns an error response", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.reject("notAValidJSON"),
        } as Response),
      );

      const result = await tokenEncrypter.encrypt(dummyJwt);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Response body cannot be parsed as JSON",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given 'keys' is missing from the response body", () => {
    it("Returns an error response", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({}),
        } as Response),
      );

      const result = await tokenEncrypter.encrypt(dummyJwt);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Not a valid JWKS",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given 'keys' is not an array", () => {
    it("Returns an error response", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ keys: "notAnArray" }),
        } as Response),
      );

      const result = await tokenEncrypter.encrypt(dummyJwt);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Not a valid JWKS",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given the JWKS does not contain an encryption JWK", () => {
    it("Returns an error response", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ keys: [{ kty: "RSA", use: "sig" }] }),
        } as Response),
      );

      const result = await tokenEncrypter.encrypt(dummyJwt);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "No encryption key in JWKS",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given the encryption JWK is invalid and therefore cannot be parsed as a KeyObject", () => {
    it("Returns an error response", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ keys: [{ kty: "RSA", use: "enc" }] }),
        } as Response),
      );

      const result = await tokenEncrypter.encrypt(dummyJwt);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error creating public encryption key",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given the encryption JWK is invalid as it's missing required fields", () => {
    it("Returns an error response", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ keys: [{ kty: "RSA", use: "enc" }] }),
        } as Response),
      );

      const result = await tokenEncrypter.encrypt(dummyJwt);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error creating public encryption key",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given an error happens trying to encrypt the JWT (e.g. JWK type is not compatible with encryption algorithm)", () => {
    it("Returns an error response", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () =>
            Promise.resolve({
              keys: [
                {
                  kty: "EC",
                  x: "-JBGGl6V4K-9VJZ_UfPljiHlteQCqTwbbMHEAxv0_NA",
                  y: "ZgDwVZCrtEHfdrJwgq3n7a2pdPUFLabCYLUu6Un3VXE",
                  crv: "P-256",
                  kid: "SNFJEFlxy-FxCkRtvj1VD38VuotQ-ta6a2w7p4j6jhY",
                  use: "enc",
                  alg: "ES256",
                },
              ],
            }),
        } as Response),
      );

      const result = await tokenEncrypter.encrypt(dummyJwt);

      expect(result.isError).toBe(true);
      expect(result.value).toStrictEqual({
        errorMessage: "Error encrypting token",
        errorCategory: "SERVER_ERROR",
      });
    });
  });

  describe("Given the JWT is encrypted", () => {
    it("Returns a success response with the JWE", async () => {
      const result = await tokenEncrypter.encrypt(dummyJwt);

      const resultValue = result.value as string;

      expect(result.isError).toBe(false);
      expect(resultValue.split(".")).toHaveLength(5);
      expect(
        resultValue.startsWith(
          "eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0",
        ),
      ).toBeTruthy();
    });
  });
});
