import { createHash } from "crypto";
import { Result, errorResult, successResult } from "../../utils/result";
import {
  GetParameterCommand,
  GetParameterRequest,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { ssmClient } from "./ssmClient";

let cache: CacheEntry | null = null;

export class ClientCredentialsService
  implements
    IGetClientCredentials,
    IValidateAsyncTokenRequest,
    IValidateAsyncCredentialRequest,
    IGetClientCredentialsById
{
  ssmClient: SSMClient;
  cacheTTL: number;

  constructor() {
    this.ssmClient = new SSMClient(ssmClient);
    this.cacheTTL = 3600 * 1000;
  }

  getClientCredentials = async (): Promise<Result<IClientCredentials[]>> => {
    if (cache && cache.expiry > Date.now()) {
      return successResult(cache.data);
    }

    const command: GetParameterRequest = {
      Name: "/dev/async-credential/CLIENT_CREDENTIALS",
      WithDecryption: true, // Parameter is encrypted at rest
    };

    let response;
    try {
      response = await this.ssmClient.send(new GetParameterCommand(command));
    } catch (e: unknown) {
      return errorResult("Client Credentials not found");
    }

    const clientCredentialResponse = response.Parameter?.Value;

    if (!clientCredentialResponse) {
      return errorResult("Client Credentials is null or undefined");
    }

    let parsedCredentials;
    try {
      parsedCredentials = JSON.parse(clientCredentialResponse);
    } catch (e: unknown) {
      return errorResult("Client Credentials is not valid JSON");
    }

    if (!this.isCredentialsArrayValid(parsedCredentials)) {
      return errorResult("Parsed Client Credentials array is malformed");
    }

    cache = {
      expiry: Date.now() + this.cacheTTL,
      data: parsedCredentials,
    };

    return successResult(parsedCredentials);
  };

  validateAsyncTokenRequest = (
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

  validateAsyncCredentialRequest = (
    config: IValidateAsyncCredentialRequestConfig,
  ): Result<null> => {
    const registeredRedirectUri = config.storedCredentials.redirect_uri;
    if (!registeredRedirectUri) {
      return errorResult("Missing redirect_uri");
    }

    try {
      new URL(registeredRedirectUri);
    } catch (e) {
      return errorResult("Invalid redirect_uri");
    }

    if (config.redirectUri !== config.storedCredentials.redirect_uri) {
      return errorResult("Unregistered redirect_uri");
    }

    if (config.aud !== config.storedCredentials.issuer) {
      return errorResult("Invalid aud claim");
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

  private isCredentialsArrayValid = (
    credentials: IClientCredentials[] | undefined,
  ): boolean => {
    if (!Array.isArray(credentials)) {
      return false;
    }

    if (credentials.length === 0) {
      return false;
    }

    if (!this.isValidCredentialCredentialsStructure(credentials)) {
      return false;
    }

    return true;
  };

  private isValidCredentialCredentialsStructure(
    credentialArray: IClientCredentials[],
  ): boolean {
    return credentialArray.every(
      (obj) =>
        typeof obj.client_id === "string" &&
        typeof obj.issuer === "string" &&
        typeof obj.salt === "string" &&
        typeof obj.hashed_client_secret === "string" &&
        Object.keys(obj).length === 4,
    );
  }

  resetCache() {
    cache = null;
  }
}

const hashSecret = (secret: string, salt: string): string => {
  return createHash("sha256")
    .update(secret + salt)
    .digest("hex");
};

export interface IGetClientCredentials {
  getClientCredentials: () => Promise<Result<IClientCredentials[]>>;
}

export interface IValidateAsyncTokenRequest {
  validateAsyncTokenRequest: (
    storedCredentials: IClientCredentials,
    suppliedCredentials: IDecodedClientCredentials,
  ) => Result<null>;
}

export interface IGetClientCredentialsById {
  getClientCredentialsById: (
    storedCredentialsArray: IClientCredentials[],
    suppliedClientId: string,
  ) => Result<IClientCredentials>;
}

export interface IValidateAsyncCredentialRequest {
  validateAsyncCredentialRequest: (
    config: IValidateAsyncCredentialRequestConfig,
  ) => Result<null>;
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

interface CacheEntry {
  expiry: number;
  data: IClientCredentials[];
}

export interface IValidateAsyncCredentialRequestConfig {
  aud: string;
  issuer: string;
  storedCredentials: IClientCredentials;
  redirectUri?: string;
}
