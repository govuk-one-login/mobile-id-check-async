import {
  GetParameterCommand,
  GetParameterRequest,
  SSMClient,
  SSMClientConfig,
} from "@aws-sdk/client-ssm";
import { LogOrValue, log, value } from "../../types/logOrValue";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { IClientCredentials } from "../../services/clientCredentialsService/clientCredentialsService";

let cache: CacheEntry | null = null;

export class SsmService implements IGetClientCredentials {
  ssmClient: SSMClient;
  cacheTTL: number;

  constructor() {
    const config: SSMClientConfig = {
      region: "eu-west-2",
      maxAttempts: 2,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 29000,
        requestTimeout: 29000,
      }),
    };
    this.ssmClient = new SSMClient(config);
    this.cacheTTL = 3600 * 1000;
  }

  getClientCredentials = async (): Promise<
    LogOrValue<IClientCredentials[]>
  > => {
    if (cache && cache.expiry > Date.now()) {
      return value(cache.data);
    }

    const command: GetParameterRequest = {
      Name: "/dev/async-credential/CLIENT_CREDENTIALS",
      WithDecryption: true, // Parameter is encrypted at rest
    };

    let response;
    try {
      response = await this.ssmClient.send(new GetParameterCommand(command));
    } catch (error: any) {
      return log("Client Credentials not found");
    }

    const clientCredentialResponse = response.Parameter?.Value;

    if (!clientCredentialResponse) {
      return log("Client Credentials is null or undefined");
    }

    let parsedCredentials;
    try {
      parsedCredentials = JSON.parse(clientCredentialResponse);
    } catch (error) {
      return log("Client Credentials is not valid JSON");
    }

    if (!this.isCredentialsArrayValid(parsedCredentials)) {
      return log("Parsed Client Credentials array is malformed");
    }

    cache = {
      expiry: Date.now() + this.cacheTTL,
      data: parsedCredentials,
    };

    return value(parsedCredentials);
  };

  private isCredentialsArrayValid = (
    credentials: any[] | undefined,
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
    credentialArray: any[],
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

export interface IGetClientCredentials {
  getClientCredentials: () => Promise<LogOrValue<IClientCredentials[]>>;
}

interface CacheEntry {
  expiry: number;
  data: IClientCredentials[];
}
