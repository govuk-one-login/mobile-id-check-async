import { successResult } from "../../utils/result";
import { getBiometricToken } from "./getBiometricToken";

describe("getBiometricToken", () => {
  it("Returns successResult containing a string", async () => {
    const result = await getBiometricToken("mockUrl", "mockSubmitterKey");

    expect(result).toEqual(successResult("mockBiometricToken"));
  });
});
