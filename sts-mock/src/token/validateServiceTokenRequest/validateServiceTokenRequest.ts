import { errorResult, Result, successResult } from "../../utils/result";

export type IValidateServiceTokenRequest = (
  requestBody: string | null,
) => Result<ValidServiceTokenRequestParams>;

export type ValidServiceTokenRequestParams = {
  subjectId: string;
  scope: string;
};

export const validateServiceTokenRequest: IValidateServiceTokenRequest = (
  requestBody,
) => {
  if (requestBody == null) {
    return errorResult({
      errorMessage: "Missing request body",
      errorCategory: "CLIENT_ERROR",
    });
  }
  const searchParams = new URLSearchParams(requestBody);

  const subjectToken = searchParams.get("subject_token");
  if (!subjectToken) {
    return errorResult({
      errorMessage: "Missing subject_token",
      errorCategory: "CLIENT_ERROR",
    });
  }

  const scope = searchParams.get("scope");
  if (!scope) {
    return errorResult({
      errorMessage: "Missing scope",
      errorCategory: "CLIENT_ERROR",
    });
  }

  return successResult({ subjectId: subjectToken, scope: scope });
};
