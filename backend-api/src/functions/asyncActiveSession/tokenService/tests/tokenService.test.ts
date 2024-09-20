import { ITokenService, TokenService } from "../tokenService";

describe("Token Service", () => {
  let mockFetch: jest.SpyInstance;
  let tokenService: ITokenService;

  beforeEach(() => {
    tokenService = new TokenService();
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  describe("Get Sub From Token", () => {
    describe("Retrieving STS public key", () => {
      describe("Given an unexpected error retrieving the public key", () => {
        it("Returns error result", async () => {
          mockFetch = jest.spyOn(global, "fetch").mockImplementation(() =>
            Promise.resolve({
              status: 500,
              ok: false,
            } as Response),
          );

          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
          );

          expect(mockFetch).toHaveBeenCalledWith(
            "https://mockJwksEndpoint.com",
            {
              method: "GET",
            },
          );
          expect(result.isError).toBe(true);
          expect(result.value).toStrictEqual({
            errorMessage: "Unexpected error retrieving STS public key",
            errorCategory: "SERVER_ERROR",
          });
        });
      });
    });
  });
});
