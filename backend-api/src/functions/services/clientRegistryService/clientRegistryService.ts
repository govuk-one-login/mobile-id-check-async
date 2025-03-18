import { createHash } from "crypto";
import {
  Result,
  errorResult,
  successResult,
  ErrorCategory,
} from "../../utils/result";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { isValidUrl } from "../utils/isValidUrl";

let cache: CacheEntry | null = null;

export class ClientRegistryService
  implements
    IGetRegisteredIssuerUsingClientSecrets,
    IGetPartialRegisteredClientByClientId
{
  secretsManagerClient: SecretsManagerClient;
  cacheTTL: number;
  clientRegistrySecretName: string;

  constructor(clientRegistrySecretName: string) {
    this.secretsManagerClient = new SecretsManagerClient();
    this.cacheTTL = 3600 * 1000;
    this.clientRegistrySecretName = clientRegistrySecretName;
  }

  getRegisteredIssuerUsingClientSecrets = async (
    secrets: IDecodedClientSecrets,
  ): Promise<Result<string>> => {
    const clientRegistryResult = await this.getClientRegistry();
    if (clientRegistryResult.isError)
      return errorResult(clientRegistryResult.value);
    const clientRegistry = clientRegistryResult.value;

    const registeredClient = this.getRegisteredClientByClientId(
      clientRegistry,
      secrets.clientId,
    );

    if (!registeredClient)
      return errorResult({
        errorMessage: "Client is not registered",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });

    const isClientSecretsValid = this.validateClientSecrets(
      {
        hashedClientSecret: registeredClient.hashed_client_secret,
        salt: registeredClient.salt,
      },
      secrets,
    );
    if (!isClientSecretsValid)
      return errorResult({
        errorMessage: "Client credentials are invalid",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });

    return successResult(registeredClient.issuer);
  };

  getPartialRegisteredClientByClientId = async (
    clientId: string,
  ): Promise<Result<{ issuer: string; redirectUri: string }>> => {
    const clientRegistryResult = await this.getClientRegistry();
    if (clientRegistryResult.isError)
      return errorResult(clientRegistryResult.value);
    const clientRegistry = clientRegistryResult.value;

    const registeredClient = this.getRegisteredClientByClientId(
      clientRegistry,
      clientId,
    );
    if (!registeredClient)
      return errorResult({
        errorMessage: "Client is not registered",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });

    return successResult({
      issuer: registeredClient.issuer,
      redirectUri: registeredClient.redirect_uri,
    });
  };

  private readonly getClientRegistry = async (): Promise<
    Result<IClientRegistry>
  > => {
    if (cache && cache.expiry > Date.now()) {
      return successResult(cache.data);
    }
    const command = new GetSecretValueCommand({
      SecretId: this.clientRegistrySecretName,
    });

    let response;
    try {
      response = await this.secretsManagerClient.send(command);
    } catch {
      return errorResult({
        errorMessage: "Error retrieving client secrets",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    const clientRegistryResponse = response.SecretString;

    if (!clientRegistryResponse) {
      return errorResult({
        errorMessage: "Client registry not found",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }
    let clientRegistry;
    try {
      clientRegistry = JSON.parse(clientRegistryResponse);
    } catch {
      return errorResult({
        errorMessage: "Client registry is not a valid JSON",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }
    if (!Array.isArray(clientRegistry)) {
      return errorResult({
        errorMessage: "Client registry is not an array",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    if (clientRegistry.length === 0) {
      return errorResult({
        errorMessage: "Client registry is empty",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    }

    const allPropertiesPresent = clientRegistry.every(
      (registeredClient) =>
        typeof registeredClient.client_id === "string" &&
        typeof registeredClient.issuer === "string" &&
        typeof registeredClient.salt === "string" &&
        typeof registeredClient.hashed_client_secret === "string" &&
        isValidUrl(registeredClient.redirect_uri) &&
        Object.keys(registeredClient).length === 5,
    );
    if (!allPropertiesPresent)
      return errorResult({
        errorMessage: "Client registry failed schema validation",
        errorCategory: ErrorCategory.SERVER_ERROR,
      });
    cache = {
      expiry: Date.now() + this.cacheTTL,
      data: clientRegistry,
    };
    return successResult(clientRegistry);
  };

  private readonly getRegisteredClientByClientId = (
    clientRegistry: IClientRegistry,
    clientId: string,
  ): IRegisteredClient | undefined => {
    const registeredClient = clientRegistry.find((client) => {
      return client.client_id === clientId;
    });

    if (!registeredClient) return undefined;

    return registeredClient;
  };
  private readonly validateClientSecrets = (
    registeredClientSecrets: { hashedClientSecret: string; salt: string },
    incomingClientSecrets: { clientId: string; clientSecret: string },
  ): boolean => {
    const storedSalt = registeredClientSecrets.salt;
    const hashedSuppliedClientSecret = hashSecret(
      incomingClientSecrets.clientSecret,
      storedSalt,
    );
    const hashedStoredClientSecret = registeredClientSecrets.hashedClientSecret;
    return hashedStoredClientSecret === hashedSuppliedClientSecret;
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

export interface IGetRegisteredIssuerUsingClientSecrets {
  getRegisteredIssuerUsingClientSecrets: (
    credentials: IDecodedClientSecrets,
  ) => Promise<Result<string>>;
}

export interface IGetPartialRegisteredClientByClientId {
  getPartialRegisteredClientByClientId: (
    clientId: string,
  ) => Promise<Result<{ issuer: string; redirectUri: string }>>;
}

export type IRegisteredClient = {
  client_id: string;
  issuer: string;
  salt: string;
  hashed_client_secret: string;
  redirect_uri: string;
};

export interface IDecodedClientSecrets {
  clientId: string;
  clientSecret: string;
}

interface CacheEntry {
  expiry: number;
  data: IClientRegistry;
}

type IClientRegistry = IRegisteredClient[];
