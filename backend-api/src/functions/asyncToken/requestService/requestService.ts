import { IDecodedClientSecrets } from "../../services/clientRegistryService/clientRegistryService";
import { errorResult, Result, successResult } from "../../utils/result";
import { APIGatewayProxyEvent } from "aws-lambda";

export class RequestService implements IProcessRequest {
  processRequest = (
    request: APIGatewayProxyEvent,
  ): Result<IDecodedClientSecrets> => {
    const requestBody = request.body;
    const authorizationHeader = request.headers["Authorization"];

    if (!this.isRequestBodyValid(requestBody)) {
      return errorResult({
        errorMessage: "Invalid grant_type",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (!authorizationHeader) {
      return errorResult({
        errorMessage: "Invalid authorization header",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (!authorizationHeader.startsWith("Basic ")) {
      return errorResult({
        errorMessage: "Invalid authorization header",
        errorCategory: "CLIENT_ERROR",
      });
    }

    const base64EncodedCredential = authorizationHeader.split(" ")[1];
    const base64DecodedCredential = Buffer.from(
      base64EncodedCredential,
      "base64",
    ).toString("utf-8");
    const [clientId, clientSecret] = base64DecodedCredential.split(":");

    if (!clientId || !clientSecret) {
      return errorResult({
        errorMessage: "Client secret incorrectly formatted",
        errorCategory: "CLIENT_ERROR",
      });
    }

    return successResult({ clientId, clientSecret });
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
  ) => Result<IDecodedClientSecrets>;
}

export interface IDecodedAuthorizationHeader {
  clientId: string;
  clientSecret: string;
}
