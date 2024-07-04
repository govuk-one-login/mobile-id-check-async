import { IDecodedClientCredentials } from "../../types/clientCredentials";
import { LogOrValue, log, value } from "../../types/logOrValue";
import { APIGatewayProxyEvent } from "aws-lambda";
const Buffer = require("buffer").Buffer;

export class RequestService implements IProcessRequest {
  processRequest = (
    request: APIGatewayProxyEvent,
  ): LogOrValue<IDecodedClientCredentials> => {
    const requestBody = request.body;
    const authorizationHeader = request.headers["Authorization"];

    if (!this.isRequestBodyValid(requestBody)) {
      return log("Invalid grant_type");
    }

    if (!this.isRequestAuthorizationHeaderValid(authorizationHeader)) {
      return log("Invalid authorization header");
    }

    const decodeAuthorizationHeader =
      this.decodeAuthorizationHeader(authorizationHeader);
    if (decodeAuthorizationHeader.isLog) {
      return log("Client secret incorrectly formatted"); //TODO: there is sort of two logs for this, see private function
    }

    const decodedClientCredentials =
      decodeAuthorizationHeader.value as IDecodedClientCredentials;

    return value(decodedClientCredentials);
  };

  private isRequestBodyValid = (body: string | null): boolean => {
    if (body == null) {
      return false;
    }

    const { grant_type } = JSON.parse(body);
    if (grant_type !== "client_credentials") {
      return false;
    }

    return true;
  };

  private isRequestAuthorizationHeaderValid = (
    authorizationHeader: string | undefined,
  ): boolean => {
    if (!authorizationHeader) {
      return false;
    }

    if (!authorizationHeader.startsWith("Basic ")) {
      return false;
    }

    return true;
  };

  private decodeAuthorizationHeader = (
    authorizationHeader: string | undefined,
  ): LogOrValue<IDecodedClientCredentials> => {
    const base64EncodedCredential = authorizationHeader?.split(" ")[1];
    const base64DecodedCredential = Buffer.from(
      base64EncodedCredential,
      "base64",
    ).toString("utf-8");
    const [clientId, clientSecret] = base64DecodedCredential.split(":");

    if (!clientId || !clientSecret) {
      return log(
        "BASE64_ENCODED_CLIENT_ID_AND_SECRET incorrectly formatted Authorization header",
      );
    }

    return value({ clientId, clientSecret });
  };
}

export interface IProcessRequest {
  processRequest: (
    request: APIGatewayProxyEvent,
  ) => LogOrValue<IDecodedClientCredentials>;
}
