import { createHash } from "crypto";

export class ClientCredentialsService implements IClientCredentialsService {
  validate = (
    storedCredentials: IClientCredentials,
    suppliedCredentials: IDecodedClientCredentials,
  ): boolean => {
    const { clientSecret: suppliedClientSecret } = suppliedCredentials;
    const storedSalt = storedCredentials.salt;
    const hashedSuppliedClientSecret = hashSecret(
      suppliedClientSecret,
      storedSalt,
    );
    const hashedStoredClientSecret = storedCredentials.hashed_client_secret;
    const isValidClientSecret =
      hashedStoredClientSecret === hashedSuppliedClientSecret;

    return isValidClientSecret;
  };

  getClientCredentialsById = (
    storedCredentialsArray: IClientCredentials[],
    suppliedClientId: string,
  ) => {
    const storedCredentials = storedCredentialsArray.find(
      (cred: IClientCredentials) => cred.client_id === suppliedClientId,
    );
    if (!storedCredentials) return null;

    return storedCredentials;
  };
}

const hashSecret = (secret: string, salt: string): string => {
  return createHash("sha256")
    .update(secret + salt)
    .digest("hex");
};

export interface IClientCredentialsService {
  validate: (
    storedCredentials: IClientCredentials,
    suppliedCredentials: IDecodedClientCredentials,
  ) => boolean;

  getClientCredentialsById: (
    storedCredentialsArray: IClientCredentials[],
    suppliedClientId: string,
  ) => IClientCredentials | null;
}

export type IClientCredentials = {
  client_id: string;
  issuer: string;
  salt: string;
  hashed_client_secret: string;
};

export interface IDecodedClientCredentials {
  clientId: string;
  clientSecret: string;
}
