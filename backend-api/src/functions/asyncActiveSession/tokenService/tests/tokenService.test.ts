import { TokenService } from "../tokenService";

describe("Token Service", () => {
  describe("Get Sub From Token", () => {
    describe("Retrieving STS public key", () => {
      describe("Given an unexpected error retrieving the public key", () => {
        it("Returns error result", async () => {
          // TODO: Mock fetch as this is currently only failing due to the URL not being 'real'
          const tokenService = new TokenService();

          const result = await tokenService.getSubFromToken(
            "https://mockJwksEndpoint.com",
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
