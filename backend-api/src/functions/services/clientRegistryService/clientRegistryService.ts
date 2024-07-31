import { createHash } from "crypto";
import { Result, errorResult, successResult } from "../../utils/result";
import {
  GetParameterCommand,
  GetParameterRequest,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { ssmClient } from "./ssmClient";

let cache: CacheEntry | null = null;

export class ClientRegistryService
  implements
    IGetRegisteredIssuerUsingClientSecrets,
    IGetPartialRegisteredClientByClientId
{
  ssmClient: SSMClient;
  cacheTTL: number;

  constructor() {
    this.ssmClient = ssmClient;
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

    const registeredClient = this.getRegisteredClientByClientId(
      clientRegistery,
      credentials.clientId,
    );
    if (!registeredClient) return errorResult("Client is not registered");

    const isClientSecretsValid = this.validateClientSecrets(
      {
        hashedClientSecret: registeredClient.hashed_client_secret,
        salt: registeredClient.salt,
      },
      credentials,
    );
    if (!isClientSecretsValid)
      return errorResult("Client credentials are invalid");

    return successResult(registeredClient.issuer);
  };

  getPartialRegisteredClientByClientId = async (
    clientId: string,
  ): Promise<Result<{ issuer: string; redirectUri: string }>> => {
    const clientRegistryResult = await this.getClientRegistery();
    if (clientRegistryResult.isError)
      return errorResult(clientRegistryResult.value);
    const clientRegistery = clientRegistryResult.value;

    const registeredClient = this.getRegisteredClientByClientId(
      clientRegistery,
      clientId,
    );
    if (!registeredClient) return errorResult("Client is not registered");

    return successResult({
      issuer: registeredClient.issuer,
      redirectUri: registeredClient.redirect_uri,
    });
  };

  private getClientRegistery = async (): Promise<Result<IClientRegistry>> => {
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

    const clientRegistryResponse = response.Parameter?.Value;

    if (!clientRegistryResponse) {
      return errorResult("Client registry not found");
    }
    let clientRegistry;
    try {
      clientRegistry = JSON.parse(clientRegistryResponse);
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
        this.isValidUrl(registeredClient.redirect_uri) &&
        Object.keys(registeredClient).length === 5,
    );
    if (!allPropertiesPresent)
      return errorResult("Client registry failed schema validation");
    cache = {
      expiry: Date.now() + this.cacheTTL,
      data: clientRegistry,
    };
    return successResult(clientRegistry);
  };

  private isValidUrl = (rawUrl: string): boolean => {
    try {
      new URL(rawUrl);
    } catch (error) {
      return false;
    }
    return true;
  };
  private getRegisteredClientByClientId = (
    clientRegistery: IClientRegistry,
    clientId: string,
  ): IRegisteredClient | undefined => {
    const registeredClient = clientRegistery.find((client) => {
      return client.client_id === clientId;
    });

    if (!registeredClient) return undefined;

    return registeredClient;
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
  getRegisteredIssuerUsingClientSecrets: (credentials: {
    clientId: string;
    clientSecret: string;
  }) => Promise<Result<string>>;
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
