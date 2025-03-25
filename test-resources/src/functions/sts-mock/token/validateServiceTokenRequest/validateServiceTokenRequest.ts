import {
  errorResult,
  Result,
  successResult,
} from "../../../common/utils/result";

export type IValidateServiceTokenRequest = (
  requestBody: string | null,
) => Result<ValidServiceTokenRequestParams>;

export type ValidServiceTokenRequestParams = {
  subjectId: string;
  scope: string;
};

const REQUIRED_REQUEST_PARAMS = [
  "grant_type",
  "scope",
  "subject_token",
  "subject_token_type",
];
const SUPPORTED_SERVICE_SCOPE = "idCheck.activeSession.read";
const SUPPORTED_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:token-exchange";
const SUPPORTED_SUBJECT_TOKEN_TYPE =
  "urn:ietf:params:oauth:token-type:access_token";

export const validateServiceTokenRequest: IValidateServiceTokenRequest = (
  requestBody,
) => {
  if (!requestBody) {
    return errorResult({
      errorMessage: "Missing request body",
      errorCategory: "CLIENT_ERROR",
    });
  }
  const searchParams = new URLSearchParams(requestBody);

  for (const requiredParam of REQUIRED_REQUEST_PARAMS) {
    const param = searchParams.get(requiredParam);
    if (!param) {
      return errorResult({
        errorMessage: `Missing ${requiredParam}`,
        errorCategory: "CLIENT_ERROR",
      });
    }
  }

  const subjectToken = searchParams.get("subject_token")!;

  const scope = searchParams.get("scope");
  if (scope !== SUPPORTED_SERVICE_SCOPE) {
    return errorResult({
      errorMessage: "Unsupported scope",
      errorCategory: "CLIENT_ERROR",
    });
  }

  const subjectTokenType = searchParams.get("subject_token_type");
  if (subjectTokenType !== SUPPORTED_SUBJECT_TOKEN_TYPE) {
    return errorResult({
      errorMessage: "Unsupported subject_token_type",
      errorCategory: "CLIENT_ERROR",
    });
  }

  const grantType = searchParams.get("grant_type");
  if (grantType !== SUPPORTED_GRANT_TYPE) {
    return errorResult({
      errorMessage: "Unsupported grant_type",
      errorCategory: "CLIENT_ERROR",
    });
  }

  return successResult({ subjectId: subjectToken, scope: scope });
};
