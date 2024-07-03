import { LogOrValue, log, value } from "../../types/logOrValue";

describe("Token Service", () => {
  describe("Given the token signature fails", () => {
    it("Returns a log", async () => {
      const tokenService = new TokenService();
      const result = await tokenService.verifyTokenSignature();
      expect(result.isLog).toBe(true);
      expect(result.value).toEqual("TOKEN_SIGNATURE_INVALID");
    });
  });
});

export interface IVerifyTokenSignature {
  verifyTokenSignature: () => Promise<LogOrValue<null>>;
}

export class TokenService implements IVerifyTokenSignature {
  async verifyTokenSignature(): Promise<LogOrValue<null>> {
    return value(null);
  }
}
