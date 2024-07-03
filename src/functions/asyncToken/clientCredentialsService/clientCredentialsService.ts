import { createHash } from "crypto";
import { IDecodedAuthorizationHeader } from "../requestService/requestService";

export class ClientCredentialsService implements IClientCredentialsService {
  validate = (
    storedCredentials: IClientCredentials,
    suppliedCredentials: IDecodedAuthorizationHeader,
  ): boolean => {
    const { clientSecret: suppliedClientSecret } = suppliedCredentials;
    const storedSalt = storedCredentials.salt;
    const hashedSuppliedClientSecret = this.hashSecret(
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

  private hashSecret = (secret: string, salt: string): string => {
    return createHash("sha256")
      .update(secret + salt)
      .digest("hex");
  };
}

export interface IClientCredentialsService {
  validate: (
    storedCredentials: IClientCredentials,
    suppliedCredentials: IDecodedAuthorizationHeader,
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
