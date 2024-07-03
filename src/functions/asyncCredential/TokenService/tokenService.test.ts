import { LogOrValue, log, value } from "../../types/logOrValue";

describe("Token Service", () => {
  describe("Given the token signature fails", () => {
    it("Returns a log", async () => {
      const tokenService = new TokenService();
      const result = await tokenService.verifySignature();
      expect(result.isLog).toBe(true);
      expect(result.value).toEqual("TOKEN_SIGNATURE_INVALID");
    });
  });
});

class TokenService {
  async verifySignature(): Promise<LogOrValue<null>> {
    return value(null);
  }
}
