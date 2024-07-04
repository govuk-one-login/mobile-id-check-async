import { KMSClient, VerifyCommand } from "@aws-sdk/client-kms";
import { LogOrValue, log, value } from "../../types/logOrValue";
import { mockClient } from "aws-sdk-client-mock";
import format from "ecdsa-sig-formatter";

// Generated using jwt.io with thier public and private keys
const mockJwt = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.tyh-VfuzIxCyGYDlkBA7DfyjrqmSHu6pQ2hoZuFqUSLPNY2N0mpHb3nk5K17HWP_3cYHBw7AhHale5wky6-sVA"

describe("Token Service", () => {
  describe("Given the token signature is not valid", () => {
    it("Returns a log", async () => {
      const kmsMock = mockClient(KMSClient);
      kmsMock.on(VerifyCommand).resolves({ SignatureValid: false });
      const tokenService = new TokenService();
      const result = await tokenService.verifyTokenSignature(
        "mockKeyId",
        mockJwt,
      );
      expect(result.isLog).toBe(true);
      expect(result.value).toEqual("TOKEN_SIGNATURE_INVALID");
    });
  });
});

export interface IVerifyTokenSignature {
  verifyTokenSignature: (
    keyId: string,
    jwt: string,
  ) => Promise<LogOrValue<null>>;
}

export class TokenService implements IVerifyTokenSignature {
  async verifyTokenSignature(
    keyId: string,
    jwt: string,
  ): Promise<LogOrValue<null>> {
    const [header, payload, signature] = jwt.split(".");
    const kmsClient = new KMSClient();
    const verifyCommand = new VerifyCommand({
      KeyId: keyId,
      SigningAlgorithm: "ECDSA_SHA_256",
      Signature: format.joseToDer(signature, "ES256"),
      Message: Buffer.from(`${header}.${payload}`),
    });

    const result = await kmsClient.send(verifyCommand);
    if (result.SignatureValid === false) {
      return log("TOKEN_SIGNATURE_INVALID");
    }
    return value(null);
  }
}
