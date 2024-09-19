import { errorResult, Result, successResult } from "../../utils/result";
import { IRequestBody } from "../asyncCredentialHandler";
import { getBearerToken } from "../../services/utils/requestService";

export interface IRequestService {
  getAuthorizationHeader: (
    authorizationHeader: string | undefined,
  ) => Result<string>;
  getRequestBody: (
    requestBody: string | null,
    jwtClientId: string,
  ) => Result<IRequestBody>;
}

export class RequestService implements IRequestService {
  getAuthorizationHeader = (authorizationHeader: string | undefined) => {
    return getBearerToken(authorizationHeader)
  };

  getRequestBody = (
    requestBody: string | null,
    jwtClientId: string,
  ): Result<IRequestBody> => {
    if (requestBody == null) {
      return errorResult({
        errorMessage: "Missing request body",
        errorCategory: "CLIENT_ERROR",
      });
    }

    let body: IRequestBody;
    try {
      body = JSON.parse(requestBody);
    } catch {
      return errorResult({
        errorMessage: "Invalid JSON in request body",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (!body.state) {
      return errorResult({
        errorMessage: "Missing state in request body",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (!body.sub) {
      return errorResult({
        errorMessage: "Missing sub in request body",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (!body.client_id) {
      return errorResult({
        errorMessage: "Missing client_id in request body",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (body.client_id !== jwtClientId) {
      return errorResult({
        errorMessage:
          "client_id in request body does not match value in access_token",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (!body["govuk_signin_journey_id"]) {
      return errorResult({
        errorMessage: "Missing govuk_signin_journey_id in request body",
        errorCategory: "CLIENT_ERROR",
      });
    }

    if (body.redirect_uri) {
      try {
        new URL(body.redirect_uri);
      } catch {
        return errorResult({
          errorMessage: "redirect_uri in request body is not a URL",
          errorCategory: "CLIENT_ERROR",
        });
      }
    }

    return successResult(body);
  };
}
