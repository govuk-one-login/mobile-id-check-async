import {
  Result,
  errorResult,
  successResult,
  ErrorCategory,
} from "../../utils/result";
import { APIGatewayProxyEventHeaders } from "aws-lambda";
import { IDecodedClientSecrets } from "../../services/clientRegistryService/clientRegistryService";
import { logger } from "../../common/logging/logger";

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
    const authorizationHeader =
      headers["Authorization"] ?? headers["authorization"];
    if (!authorizationHeader) {
      return errorResult({
        errorMessage: "Missing authorization header",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });
    }

    // Temporary log for IPVCore testing in Staging
    logger.debug("IPV_DEBUG Authorization header", { authorizationHeader });

    if (!authorizationHeader.startsWith("Basic ")) {
      return errorResult({
        errorMessage: "Invalid authorization header",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });
    }

    const base64EncodedCredential = authorizationHeader.split(" ")[1];
    logger.debug("IPV_DEBUG base64EncodedCredential", base64EncodedCredential);

    const base64DecodedCredential = Buffer.from(
      base64EncodedCredential,
      "base64",
    ).toString("utf-8");
    logger.debug("IPV_DEBUG base64DecodedCredential", base64DecodedCredential);

    const [clientId, clientSecret] = base64DecodedCredential.split(":");
    logger.debug("IPV_DEBUG clientId", clientId);

    if (!clientId || !clientSecret) {
      return errorResult({
        errorMessage: "Client secret incorrectly formatted",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });
    }

    return successResult({ clientId, clientSecret });
  };
  validateBody = (body: string | null): Result<null> => {
    if (body == null) {
      return errorResult({
        errorMessage: "Missing request body",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });
    }
    const searchParams = new URLSearchParams(body);

    const grantType = searchParams.get("grant_type");
    if (!grantType) {
      return errorResult({
        errorMessage: "Missing grant_type",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });
    }
    if (grantType !== "client_credentials") {
      return errorResult({
        errorMessage: "Invalid grant_type",
        errorCategory: ErrorCategory.CLIENT_ERROR,
      });
    }

    return successResult(null);
  };
}
