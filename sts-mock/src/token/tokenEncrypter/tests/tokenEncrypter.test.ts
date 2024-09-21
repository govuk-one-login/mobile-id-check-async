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
        text: () => Promise.resolve(""),
      } as Response),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Given an error happens when requesting the encryption key", () => {
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

  describe("Given an unexpected network error happens when requesting the encryption key", () => {
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
          text: () => Promise.resolve("notAValidJSON"),
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
          text: () => Promise.resolve("{}"),
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
          text: () => Promise.resolve('{"keys":"notAnArray"}'),
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

  describe("Given the JWKS does not contain an encryption key", () => {
    it("Returns an error response", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          text: () => Promise.resolve('{"keys":[{"kty":"RSA","use":"sig"}]}'),
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

  describe("Given the encryption JWK is invalid as it's missing required fields", () => {
    it("Returns an error response", async () => {
      jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          text: () => Promise.resolve('{"keys":[{"kty":"RSA","use":"enc"}]}'),
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
});
