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
    IGetRegisteredIssueUsingClientSecrets,
    IValidateAsyncCredentialRequest,
    IGetClientCredentialsById
{
  ssmClient: SSMClient;
  cacheTTL: number;

  constructor() {
    this.ssmClient = new SSMClient(ssmClient);
    this.cacheTTL = 3600 * 1000;
  }
  getRegisteredIssuerUsingClientSecrets = async (credentials: {
    clientId: string;
    clientSecret: string;
  }): Promise<Result<string>> => {
    const clientRegistryResult = await this.getClientRegistery();
    if (clientRegistryResult.isError)
      return errorResult(clientRegistryResult.value);
    const clientRegistery = clientRegistryResult.value;

    const registeredClientCredentials =
      this.getRegisteredClientCredentialsByClientId(
        clientRegistery,
        credentials.clientId,
      );
    if (!registeredClientCredentials)
      return errorResult("Client is not registered");

    const isClientSecretsValid = this.validateClientSecrets(
      {
        hashedClientSecret: registeredClientCredentials.hashed_client_secret,
        salt: registeredClientCredentials.salt,
      },
      credentials,
    );
    if (!isClientSecretsValid)
      return errorResult("Client credentials are invalid");

    return successResult(registeredClientCredentials.issuer);
  };

  private getClientRegistery = async (): Promise<
    Result<IClientCredentials[]>
  > => {
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
      return errorResult("Error retrieving client secrets");
    }

    const clientCredentialResponse = response.Parameter?.Value;

    if (!clientCredentialResponse) {
      return errorResult("Client registry not found");
    }
    let clientRegistry;
    try {
      clientRegistry = JSON.parse(clientCredentialResponse);
    } catch (error) {
      return errorResult("Client registry is not a valid JSON");
    }
    if (!Array.isArray(clientRegistry)) {
      return errorResult("Client registry is not an array");
    }

    if (clientRegistry.length === 0) {
      return errorResult("Client registry is empty");
    }

    const allPropertiesPresent = clientRegistry.every(
      (registeredClient) =>
        typeof registeredClient.client_id === "string" &&
        typeof registeredClient.issuer === "string" &&
        typeof registeredClient.salt === "string" &&
        typeof registeredClient.hashed_client_secret === "string" &&
        Object.keys(registeredClient).length === 4,
    );
    if (!allPropertiesPresent)
      return errorResult("Client registry failed schema validation");
    cache = {
      expiry: Date.now() + this.cacheTTL,
      data: JSON.parse(clientCredentialResponse),
    };
    return successResult(clientRegistry);
  };

  private getRegisteredClientCredentialsByClientId = (
    clientRegistery: IClientCredentials[],
    clientId: string,
  ): IClientCredentials | undefined => {
    const registeredClientCredentials = clientRegistery.find(
      (registeredClientCredential) => {
        return registeredClientCredential.client_id === clientId;
      },
    );

    if (!registeredClientCredentials) return undefined;

    return registeredClientCredentials;
  };
  private validateClientSecrets = (
    registeredClientSecrets: { hashedClientSecret: string; salt: string },
    incomingClientSecrets: { clientId: string; clientSecret: string },
  ): boolean => {
    const storedSalt = registeredClientSecrets.salt;
    const hashedSuppliedClientSecret = hashSecret(
      incomingClientSecrets.clientSecret,
      storedSalt,
    );
    const hashedStoredClientSecret = registeredClientSecrets.hashedClientSecret;

    console.log("REGISTERED CLIENT SECRET", hashedStoredClientSecret);
    console.log("SUPPLIED CLIENT SECRET", hashedSuppliedClientSecret);
    return hashedStoredClientSecret === hashedSuppliedClientSecret;
  };

  validateAsyncCredentialRequest = (
    config: IValidateAsyncCredentialRequestConfig,
  ): Result<null> => {
    const registeredRedirectUri =
      config.registeredClientCredentials.redirect_uri;
    if (!registeredRedirectUri) {
      return errorResult("Missing redirect_uri");
    }

    try {
      new URL(registeredRedirectUri);
    } catch (e) {
      return errorResult("Invalid redirect_uri");
    }

    if (
      config.redirectUri !== config.registeredClientCredentials.redirect_uri
    ) {
      return errorResult("Unregistered redirect_uri");
    }

    if (config.aud !== config.registeredClientCredentials.issuer) {
      return errorResult("Invalid aud claim");
    }

    return successResult(null);
  };

  getRegisteredClientCredentialsById = (
    storedCredentialsArray: IClientCredentials[],
    suppliedClientId: string,
  ): Result<IClientCredentials> => {
    const storedCredentials = storedCredentialsArray.find(
      (cred: IClientCredentials) => cred.client_id === suppliedClientId,
    );
    if (!storedCredentials) return errorResult("ClientId not registered");

    return successResult(storedCredentials);
  };

  resetCache() {
    cache = null;
  }
}

const hashSecret = (secret: string, salt: string): string => {
  return createHash("sha256")
    .update(secret + salt)
    .digest("hex");
};

export interface IGetRegisteredIssueUsingClientSecrets {
  getRegisteredIssuerUsingClientSecrets: (credentials: {
    clientId: string;
    clientSecret: string;
  }) => Promise<Result<string>>;
}

export interface IGetClientCredentialsById {
  getRegisteredClientCredentialsById: (
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
  registeredClientCredentials: IClientCredentials;
  redirectUri?: string;
}
