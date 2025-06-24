import { importJWK, JWK, jwtVerify, KeyLike } from "jose";
import {
  emptySuccess,
  ErrorCategory,
  errorResult,
  Result,
  successResult,
} from "../../utils/result";
import { IGetKeys } from "../../common/jwks/JwksCache/types";
import { TokenServiceDependencies } from "./types";

export const verifyServiceTokenSignature = async (
  token: string,
  kid: string,
  stsBaseUrl: string,
  dependencies: TokenServiceDependencies,
): Promise<Result<void>> => {
  const getPublicKeyResult = await getPublicKeyWithKeyId(
    stsBaseUrl,
    kid,
    dependencies.getKeys,
  );
  if (getPublicKeyResult.isError) {
    return getPublicKeyResult;
  }
  const publicKey = getPublicKeyResult.value;

  try {
    await jwtVerify(token, publicKey);
  } catch (error) {
    return errorResult({
      errorMessage: `Error verifying token signature - ${error}`,
      errorCategory: ErrorCategory.CLIENT_ERROR,
    });
  }

  return emptySuccess();
};

async function getPublicKeyWithKeyId(
  stsBaseUrl: string,
  keyId: string,
  getKeys: IGetKeys,
): Promise<Result<Uint8Array | KeyLike>> {
  const jwksUri = stsBaseUrl + "/.well-known/jwks.json";

  const getJwksResult = await getKeys(jwksUri, keyId);
  const getJwkFailure = errorResult({
    errorMessage: `Error retrieving JWKS`,
    errorCategory: ErrorCategory.SERVER_ERROR,
  });
  if (getJwksResult.isError) {
    return getJwkFailure;
  }

  const jwks = getJwksResult.value;
  const jwk = jwks.keys.find((key) => "kid" in key && key.kid === keyId) as JWK;

  if (!jwk) {
    return errorResult({
      errorMessage: `No JWK found matching provided key ID`,
      errorCategory: ErrorCategory.SERVER_ERROR,
    });
  }

  let publicKey;
  try {
    publicKey = await importJWK(jwk, jwk.alg);
  } catch (error) {
    return errorResult({
      errorMessage: `Invalid JWK - ${error}`,
      errorCategory: ErrorCategory.SERVER_ERROR,
    });
  }

  return successResult(publicKey);
}
