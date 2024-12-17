import { KMSClient, SignCommand, SignCommandOutput } from "@aws-sdk/client-kms";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { Buffer } from "buffer";
import format from "ecdsa-sig-formatter";
import { IJwtPayload, JwtHeader } from "../../types/jwt";
import { errorResult, Result, successResult } from "../../utils/result";
import { base64url } from "jose";

export class TokenService implements IMintToken {
  readonly kidArn: string;
  private kmsClient = new KMSClient({
    region: "eu-west-2",
    maxAttempts: 2,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 5000,
      requestTimeout: 5000,
    }),
  });

  constructor(kidArn: string) {
    this.kidArn = kidArn;
  }

  async mintToken(jwtPayload: IJwtPayload): Promise<Result<string>> {
    // Building token
    const jwtHeader: JwtHeader = { alg: "ES256", typ: "JWT" };
    const kid = this.kidArn.split("/").pop();
    if (kid != null) {
      jwtHeader.kid = kid;
    }

    const tokenComponents = {
      header: base64url.encode(JSON.stringify(jwtHeader)),
      payload: base64url.encode(JSON.stringify(jwtPayload)),
      signature: "",
    };

    const unsignedToken = `${tokenComponents.header}.${tokenComponents.payload}`;

    // Signing token
    let result: SignCommandOutput;
    try {
      const command = new SignCommand({
        Message: Buffer.from(unsignedToken),
        KeyId: this.kidArn,
        SigningAlgorithm: "ECDSA_SHA_256",
        MessageType: "RAW",
      });

      result = await this.kmsClient.send(command);
    } catch {
      return errorResult({
        errorMessage: "Error from KMS",
        errorCategory: "SERVER_ERROR",
      });
    }

    if (!result.Signature) {
      return errorResult({
        errorMessage: "No signature in response from KMS",
        errorCategory: "SERVER_ERROR",
      });
    }

    // Convert signature to buffer and format with ES256 algorithm
    const signatureBuffer = Buffer.from(result.Signature);
    tokenComponents.signature = format.derToJose(signatureBuffer, "ES256");

    return successResult(
      `${tokenComponents.header}.${tokenComponents.payload}.${tokenComponents.signature}`,
    );
  }
}

export interface IMintToken {
  mintToken: (jwtPayload: IJwtPayload) => Promise<Result<string>>;
}
