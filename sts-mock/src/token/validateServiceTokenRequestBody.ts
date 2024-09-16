import {errorResult, Result, successResult} from "../utils/result";

export type ValidServiceTokenSub = {
    sub: string
}

export function validateServiceTokenRequestBody(requestBody: string | null): Result<ValidServiceTokenSub> {
    if (requestBody == null) {
        return errorResult({
            errorMessage: "Missing request body",
            errorCategory: "CLIENT_ERROR",
        });
    }
    const searchParams = new URLSearchParams(requestBody);

    const sub = searchParams.get("subject_token");
    if (!sub) {
        return errorResult({
            errorMessage: "Missing subject_token",
            errorCategory: "CLIENT_ERROR",
        });
    }

    //
    // const grantType = searchParams.get("grant_type");
    // if (!grantType) {
    //     return errorResult({
    //         errorMessage: "Missing grant_type",
    //         errorCategory: "CLIENT_ERROR",
    //     });
    // }
    // if (grantType !== "urn:ietf:params:oauth:grant-type:token-exchange") {
    //     return errorResult({
    //         errorMessage: "Invalid grant_type",
    //         errorCategory: "CLIENT_ERROR",
    //     });
    // }

    // const requiredParams = ['grant_type', 'scope', 'subject_token_type', 'subject_token']

    return successResult({sub: sub});
}