import { KMSClient, VerifyCommand } from "@aws-sdk/client-kms";
import { mockClient } from "aws-sdk-client-mock";
import format from "ecdsa-sig-formatter";
import { LogOrValue, log, value } from "../../types/logOrValue";

// Generated using jwt.io with thier public and private keys
const mockJwt =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.tyh-VfuzIxCyGYDlkBA7DfyjrqmSHu6pQ2hoZuFqUSLPNY2N0mpHb3nk5K17HWP_3cYHBw7AhHale5wky6-sVA";

describe("Token Service", () => {
  describe("JWT payload validation", () => {
    describe("Given expiry date is not present", () => {
      it("Returns a log", () => {
        const tokenService = new TokenService();
        const result = tokenService.validateTokenPayload(mockJwt);

        expect(result.isLog).toBe(true);
        expect(result.value).toEqual("EXPIRY_DATE_MISSING");
      });
    });
  });

  describe("JWT signature verification", () => {
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

    describe("Given the token signature is valid", () => {
      it("Returns a value of null", async () => {
        const kmsMock = mockClient(KMSClient);
        kmsMock.on(VerifyCommand).resolves({ SignatureValid: true });
        const tokenService = new TokenService();
        const result = await tokenService.verifyTokenSignature(
          "mockKeyId",
          mockJwt,
        );
        expect(result.isLog).toBe(false);
        expect(result.value).toEqual(null);
      });
    });
  });
});

export interface IValidateTokenPayload {
  validateTokenPayload: (keyId: string, jwt: string) => LogOrValue<null>;
}

export interface IVerifyTokenSignature {
  verifyTokenSignature: (
    keyId: string,
    jwt: string,
  ) => Promise<LogOrValue<null>>;
}

export class TokenService
  implements IValidateTokenPayload, IVerifyTokenSignature
{
  validateTokenPayload(jwt: string): LogOrValue<null> {
    const [header, payload, signature] = jwt.split(".");
    const decodedPayload = JSON.parse(base64Decode(payload));

    if (!decodedPayload.exp) {
      return log("EXPIRY_DATE_MISSING");
    }

    return value(null);
  }

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

function base64Decode(value: string): string {
  return Buffer.from(value, "base64").toString("utf-8");
}
