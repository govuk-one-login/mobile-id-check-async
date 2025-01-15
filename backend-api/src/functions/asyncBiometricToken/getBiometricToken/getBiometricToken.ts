import { logger } from "../../common/logging/logger";
import { LogMessage } from "../../common/logging/LogMessage";
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
    headers,
  };

  let response;
  try {
    logger.debug(
      LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_ATTEMPT,
      {
        data: {
          readIdUrl,
          headers,
          httpRequest,
        },
      },
    );
    response = await sendHttpRequest(httpRequest);
  } catch (error) {
    logger.error(
      LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_FAILURE,
      error as Error,
    );
    return emptyFailure();
  }

  if (response == null || response.body == null) {
    logger.error(
      LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_FAILURE,
      {
        data: {
          response,
        },
      },
    );
    return emptyFailure();
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(response.body);
  } catch (error) {
    logger.error(
      LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_FAILURE,
      error as Error,
    );
    return emptyFailure();
  }

  logger.debug(
    LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_SUCCESS,
  );
  return successResult(parsedBody.access_token);
};
