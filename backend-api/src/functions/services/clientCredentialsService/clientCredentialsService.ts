import { createHash } from "crypto";
import { Result, errorResult, successResult } from "../../utils/result";
import { IRequestBody } from "../../asyncCredential/asyncCredentialHandler";

export class ClientCredentialsService implements IClientCredentialsService {
  validateTokenRequest = (
    storedCredentials: IClientCredentials,
    suppliedCredentials: IDecodedClientCredentials,
  ): Result<null> => {
    const { clientSecret: suppliedClientSecret } = suppliedCredentials;
    const storedSalt = storedCredentials.salt;
    const hashedSuppliedClientSecret = hashSecret(
      suppliedClientSecret,
      storedSalt,
    );
    const hashedStoredClientSecret = storedCredentials.hashed_client_secret;
    const isValidClientSecret =
      hashedStoredClientSecret === hashedSuppliedClientSecret;

    if (!isValidClientSecret) {
      return errorResult("Client secret not valid for the supplied clientId");
    }

    const registeredRedirectUri = storedCredentials.redirect_uri;
    if (!registeredRedirectUri) {
      return errorResult("Missing redirect_uri");
    }

    try {
      new URL(registeredRedirectUri);
    } catch (e) {
      return errorResult("Invalid redirect_uri");
    }

    return successResult(null);
  };

  validateRedirectUri = (
    storedCredentials: IClientCredentials,
    suppliedCredentials: IRequestBody,
  ): Result<null> => {
    const registeredRedirectUri = storedCredentials.redirect_uri;
    if (!registeredRedirectUri) {
      return errorResult("Missing redirect_uri");
    }

    try {
      new URL(registeredRedirectUri);
    } catch (e) {
      return errorResult("Invalid redirect_uri");
    }

    if (suppliedCredentials.redirect_uri !== storedCredentials.redirect_uri) {
      return errorResult("Unregistered redirect_uri");
    }

    return successResult(null);
  };

  getClientCredentialsById = (
    storedCredentialsArray: IClientCredentials[],
    suppliedClientId: string,
  ): Result<IClientCredentials> => {
    const storedCredentials = storedCredentialsArray.find(
      (cred: IClientCredentials) => cred.client_id === suppliedClientId,
    );
    if (!storedCredentials) return errorResult("ClientId not registered");

    return successResult(storedCredentials);
  };
}
const hashSecret = (secret: string, salt: string): string => {
  return createHash("sha256")
    .update(secret + salt)
    .digest("hex");
};

export interface IClientCredentialsService {
  validateTokenRequest: (
    storedCredentials: IClientCredentials,
    suppliedCredentials: IDecodedClientCredentials,
  ) => Result<null>;

  validateRedirectUri: (
    storedCredentials: IClientCredentials,
    suppliedCredentials: IRequestBody,
  ) => Result<null>;

  getClientCredentialsById: (
    storedCredentialsArray: IClientCredentials[],
    suppliedClientId: string,
  ) => Result<IClientCredentials>;
}

export type IClientCredentials = {
  client_id: string;
  issuer: string;
  salt: string;
  hashed_client_secret: string;
  redirect_uri?: string;
};

export interface IDecodedClientCredentials {
  clientId: string;
  clientSecret: string;
}
