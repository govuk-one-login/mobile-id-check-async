import { errorResult, Result, successResult } from "../../utils/result";
import {CompactEncrypt} from "jose";



export class JweEncryptor {
  private readonly jwksUri: string;

  constructor (jwksUri: string) {
    this.jwksUri = jwksUri
  }
  async encrypt(jwt: string): Promise<Result<string>> {
    const jwks = await this.getProtectedServiceJwks();

    const header = {
      alg: 'RSA-OAEP-256',
      enc: 'A256GCM'
    }

    const encryptionKeyJwk = await publicKeyToJwk(params.publicEncryptionKey);
    const encryptedSignedJwt = await new CompactEncrypt(new TextEncoder().encode(jwt))
        .setProtectedHeader(header)
        .encrypt(encryptionKeyJwk);

  }

  async getProtectedServiceJwks(): Promise<Result<Response>> {
       try {
      const response = await fetch(this.jwksUri, { method: "GET" });
      if (!response.ok) {
        return errorResult({
          errorMessage: "Error fetching protected service JWKS",
          errorCategory: "SERVER_ERROR",
        });
      }
    } catch {
      return errorResult({
        errorMessage: "Unexpected network error fetching protected service JWKS",
        errorCategory: "SERVER_ERROR",
      });
    }

      // return this.formatResponse(response);
      //
      // ({
      //   errorMessage: "Invalid response received from protected service JWKS endpoint",
      //   errorCategory: "SERVER_ERROR",
      // });


  }

  async validateResponse(
      response: Response,
  ) {
    if (response.status !== 200 || response.body === undefined) {
      return errorResult({
        errorMessage: "Invalid response received from protected service JWKS endpoint",
        errorCategory: "SERVER_ERROR",
      });
    }

    let body: object
    try {
      body = JSON.parse(await response.text())
    } catch {
      return errorResult({
        errorMessage: "Invalid response received from protected service JWKS endpoint",
        errorCategory: "SERVER_ERROR",
      });
    }

    if (!('keys' in body)) return emptyFailure()
    if (!Array.isArray(body.keys)) return emptyFailure()
    if (body.keys.some(element => typeof element !== 'object'))
      return emptyFailure()
    return success(body.keys)
  }
}

export interface ICustomResourceEventSender {
  sendEvent: (status: "SUCCESS" | "FAILED") => Promise<Result<null>>;
}
