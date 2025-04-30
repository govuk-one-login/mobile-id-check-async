import {
  successResult,
  Result,
  errorResult,
  ErrorCategory,
} from "../../../utils/result";
import { IJwksBuilder } from "../jwksBuilder";
import { EncryptionJwk, Jwks, SigningJwk } from "../../../types/jwks";

const mockEncryptionJwk: EncryptionJwk = {
  kty: "RSA",
  n: "kOBby1nEUcKc-94zIa2qCyqDSE1-2bLWkVjeF3DWY_0v2j9wlLSaR6asONen_HP40wftLOSPYRcKYv6Cjz3LOY7aQYznX14EXSgJxrDwQ7AleX2VS_HB34LMZEa3xmSSH7pLtw_vmJgCNss0zDQLCz1sQwZxlqphF18FdTTUrXbJ9Qk3xIrEzvL2naO2r6WoLBQ9tSr2Sz9TTcJQptfh6hOAHm66oPA6F9uCmbTDEQeI-wLiMMArtcKrGiPAFluo8f0qNkzLRMFIqyadnZ9OZ5u0-H_urOkmLJ2nbAnyTcO-9QeDlomdEMz3yEaJeUoq-jnPpVEfIbd8-07fl7M27w",
  e: "AQAB",
  use: "enc",
  alg: "RSA-OAEP-256",
  kid: "da48d440-8e51-4383-9a3a-b91ce5adcf2a",
};

const mockSigningJwk: SigningJwk = {
  kty: "EC",
  x: "ZvtYNUEFSfoivixzC76PPJk-ka7pvAaidUiZpaHznC4",
  y: "01kuST7C4NRZlIPpBvuSrrRe9jyWfQtclSBNOv20y94",
  crv: "P-256",
  use: "sig",
  alg: "ES256",
  kid: "signing-key-id",
};

const mockJwks: Jwks = {
  keys: [mockEncryptionJwk, mockSigningJwk],
};

export class MockJwksBuilderSuccessResult implements IJwksBuilder {
  async buildJwks(): Promise<Result<Jwks>> {
    return Promise.resolve(successResult(mockJwks));
  }

  async getPublicKeyAsJwk(
    keyId: string,
  ): Promise<Result<EncryptionJwk | SigningJwk>> {
    if (keyId.includes("signing")) {
      return Promise.resolve(successResult(mockSigningJwk));
    }
    return Promise.resolve(successResult(mockEncryptionJwk));
  }

  formatAsJwk(): Result<EncryptionJwk | SigningJwk> {
    return successResult(mockEncryptionJwk);
  }
}

export class MockJwksBuilderErrorResult implements IJwksBuilder {
  async buildJwks(): Promise<Result<Jwks>> {
    return Promise.resolve(
      errorResult({
        errorMessage: "Error formatting public key as JWK",
        errorCategory: ErrorCategory.SERVER_ERROR,
      }),
    );
  }

  async getPublicKeyAsJwk(): Promise<Result<EncryptionJwk | SigningJwk>> {
    return Promise.resolve(
      errorResult({
        errorMessage: "KMS key algorithm is not supported",
        errorCategory: ErrorCategory.SERVER_ERROR,
      }),
    );
  }

  formatAsJwk(): Result<EncryptionJwk | SigningJwk> {
    return errorResult({
      errorMessage: "KMS key algorithm is not supported",
      errorCategory: ErrorCategory.SERVER_ERROR,
    });
  }
}
