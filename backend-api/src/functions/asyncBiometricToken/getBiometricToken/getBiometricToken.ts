import {
  HttpMethod,
  sendHttpRequest,
} from "../../services/http/sendHttpRequest";
import { emptyFailure, Result, successResult } from "../../utils/result";

export type GetBiometricToken = (
  url: string,
  submitterKey: string,
) => Promise<Result<string, void>>;

export const getBiometricToken: GetBiometricToken = async (
  url: string,
  submitterKey: string,
) => {
  const readIdUrl = `${url}/oauth/token?grant_type=client_credentials`;
  const headers = {
    "X-Innovalor-Authorization": submitterKey,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const httpRequest = {
    url: readIdUrl,
    method: "POST" as HttpMethod,
    headers: headers,
  };

  let response;
  try {
    response = await sendHttpRequest(httpRequest);
  } catch {
    return emptyFailure();
  }

  if (response == null || response.body == null) {
    return emptyFailure();
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(response.body);
  } catch {
    return emptyFailure();
  }

  return successResult(parsedBody.access_token);
};
