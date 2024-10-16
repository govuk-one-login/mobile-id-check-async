import { JWTVerifyResult } from "jose";
import { errorResult, Result, successResult } from "../../../utils/result";
import { IPublicKeyGetter } from "../publicKeyGetter";
import { ITokenVerifier } from "../tokenVerifier";

export class MockPubicKeyGetterGetPublicKeyError implements IPublicKeyGetter {
  getPublicKey() {
    return Promise.resolve(
      errorResult({
        errorMessage: "Failed to get public key",
        errorCategory: "CLIENT_ERROR",
      }),
    );
  }
}

export class MockPubicKeyGetterGetPublicKeySuccess implements IPublicKeyGetter {
  getPublicKey() {
    return Promise.resolve(successResult(new Uint8Array()));
  }
}

export class MockTokenVerifierVerifyError implements ITokenVerifier {
  verify(): Promise<Result<JWTVerifyResult>> {
    return Promise.resolve(
      errorResult({
        errorMessage: "Error verifying token signature",
        errorCategory: "CLIENT_ERROR",
      }),
    );
  }
}

export class MockTokenVerifierVerifySuccess implements ITokenVerifier {
  verify(): Promise<Result<JWTVerifyResult>> {
    return Promise.resolve(
      successResult({
        protectedHeader: {
          alg: "ES256",
          typ: "JWT",
        },
        payload: {
          aud: "mockIssuer",
          client_id: "mockClientId",
          exp: 1728994993626,
          iss: "mockIssuer",
          scope: "dcmaw.session.async_create",
        },
      }),
    );
  }
}
