import { IDecodedClientCredentials } from "../../types/clientCredentials";
import { error, Result, success } from "../../types/result";
import { APIGatewayProxyEvent } from "aws-lambda";

export class RequestService implements IProcessRequest {
  processRequest = (
    request: APIGatewayProxyEvent,
  ): Result<IDecodedClientCredentials> => {
    const requestBody = request.body;
    const authorizationHeader = request.headers["Authorization"];

    if (!this.isRequestBodyValid(requestBody)) {
      return error("Invalid grant_type");
    }

    if (!authorizationHeader) {
      return error("Invalid authorization header");
    }

    if (!authorizationHeader.startsWith("Basic ")) {
      return error("Invalid authorization header");
    }

    const base64EncodedCredential = authorizationHeader.split(" ")[1];
    const base64DecodedCredential = Buffer.from(
      base64EncodedCredential,
      "base64",
    ).toString("utf-8");
    const [clientId, clientSecret] = base64DecodedCredential.split(":");

    if (!clientId || !clientSecret) {
      return error("Client secret incorrectly formatted");
    }

    return success({ clientId, clientSecret });
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
}

export interface IProcessRequest {
  processRequest: (
    request: APIGatewayProxyEvent,
  ) => Result<IDecodedClientCredentials>;
}

export interface IDecodedAuthorizationHeader {
  clientId: string;
  clientSecret: string;
}
