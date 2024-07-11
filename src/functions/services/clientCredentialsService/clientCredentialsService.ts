import { createHash } from "crypto";
import {
  ErrorOrSuccess,
  errorResponse,
  successResponse,
} from "../../types/errorOrValue";
import { ICredentialRequestBody } from "../../asyncCredential/asyncCredentialHandler";

export class ClientCredentialsService implements IClientCredentialsService {
  validateTokenRequest = (
    storedCredentials: IClientCredentials,
    suppliedCredentials: IDecodedClientCredentials,
  ): ErrorOrSuccess<null> => {
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
      return errorResponse("Client secret not valid for the supplied clientId");
    }

    const registeredRedirectUri = storedCredentials.redirect_uri;
    if (!registeredRedirectUri) {
      return errorResponse("Missing redirect_uri");
    }

    try {
      new URL(registeredRedirectUri);
    } catch (error) {
      return errorResponse("Invalid redirect_uri");
    }

    return successResponse(null);
  };

  validateCredentialRequest = (
    storedCredentials: IClientCredentials,
    suppliedCredentials: ICredentialRequestBody,
  ): ErrorOrSuccess<null> => {
    const registeredRedirectUri = storedCredentials.redirect_uri;
    if (!registeredRedirectUri) {
      return errorResponse("Missing redirect_uri");
    }

    try {
      new URL(registeredRedirectUri);
    } catch (error) {
      return errorResponse("Invalid redirect_uri");
    }

    if (suppliedCredentials.redirect_uri !== storedCredentials.redirect_uri) {
      return errorResponse("Unregistered redirect_uri");
    }

    return successResponse(null);
  };

  getClientCredentialsById = (
    storedCredentialsArray: IClientCredentials[],
    suppliedClientId: string,
  ): ErrorOrSuccess<IClientCredentials> => {
    const storedCredentials = storedCredentialsArray.find(
      (cred: IClientCredentials) => cred.client_id === suppliedClientId,
    );
    if (!storedCredentials) return errorResponse("ClientId not registered");

    return successResponse(storedCredentials);
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
  ) => ErrorOrSuccess<null>;

  validateCredentialRequest: (
    storedCredentials: IClientCredentials,
    suppliedCredentials: ICredentialRequestBody,
  ) => ErrorOrSuccess<null>;

  getClientCredentialsById: (
    storedCredentialsArray: IClientCredentials[],
    suppliedClientId: string,
  ) => ErrorOrSuccess<IClientCredentials>;
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
