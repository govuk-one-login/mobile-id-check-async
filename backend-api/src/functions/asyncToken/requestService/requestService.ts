import { Result, errorResult, successResult } from "../../utils/result";
import { APIGatewayProxyEventHeaders } from "aws-lambda";
import { IDecodedClientSecrets } from "../../services/clientRegistryService/clientRegistryService";

export interface IDecodedAuthorizationHeader {
  clientId: string;
  clientSecret: string;
}

export interface IRequestService {
  getClientCredentials: (
    headers: APIGatewayProxyEventHeaders,
  ) => Result<IDecodedAuthorizationHeader>;
  validateBody: (body: string | null) => Result<null>;
}
export class RequestService implements IRequestService {
  getClientCredentials = (
    headers: APIGatewayProxyEventHeaders,
  ): Result<IDecodedClientSecrets> => {
    const authorizationHeader = headers.Authorization;
    if (!authorizationHeader) {
      return errorResult({
        errorMessage: "Missing authorization header",
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
  validateBody = (body: string | null): Result<null> => {
    if (body == null) {
      return errorResult({
        errorMessage: "Missing request body",
        errorCategory: "CLIENT_ERROR",
      });
    }

    const { grant_type } = JSON.parse(body);
    if (!grant_type) {
      return errorResult({
        errorMessage: "Missing grant_type",
        errorCategory: "CLIENT_ERROR",
      });
    }
    if (grant_type !== "client_credentials") {
      return errorResult({
        errorMessage: "Invalid grant_type",
        errorCategory: "CLIENT_ERROR",
      });
    }

    return successResult(null);
  };
}
