import {errorResult, Result, successResult} from "../utils/result";

export type IValidateServiceTokenRequestBody = (
    requestBody: string | null,
) => Result<ValidServiceTokenRequestBodyParams>

export type ValidServiceTokenRequestBodyParams = {
    sub: string
    scope: string
}

export const validateServiceTokenRequestBody: IValidateServiceTokenRequestBody = requestBody => {
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

    return successResult({sub: subjectToken, scope: scope});
}