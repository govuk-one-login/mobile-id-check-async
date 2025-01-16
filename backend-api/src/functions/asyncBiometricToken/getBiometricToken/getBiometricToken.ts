import { logger } from "../../common/logging/logger";
import { LogMessage } from "../../common/logging/LogMessage";
import {
  ISendHttpRequest,
  sendHttpRequest as sendHttpRequestDefault,
} from "../../services/http/sendHttpRequest";
import { emptyFailure, Result, successResult } from "../../utils/result";

export type GetBiometricToken = (
  url: string,
  submitterKey: string,
  sendHttpRequest?: ISendHttpRequest,
) => Promise<Result<string, void>>;

export const getBiometricToken: GetBiometricToken = async (
  url: string,
  submitterKey: string,
  sendHttpRequest: ISendHttpRequest = sendHttpRequestDefault,
) => {
  const httpRequest = {
    url: `${url}/oauth/token?grant_type=client_credentials`,
    method: "POST" as const,
    headers: {
      "X-Innovalor-Authorization": submitterKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  const httpRequestLogData = {
    ...httpRequest,
    headers: {
      ...httpRequest.headers,
      "X-Innovalor-Authorization": "Secret value and cannot be logged",
    },
  };

  let response;
  try {
    logger.debug(
      LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_ATTEMPT,
      {
        data: {
          httpRequest: httpRequestLogData,
        },
      },
    );
    response = await sendHttpRequest(httpRequest);
  } catch (error) {
    logger.error(
      LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_FAILURE,
      {
        data: {
          error,
          httpRequest: httpRequestLogData,
        },
      },
    );
    return emptyFailure();
  }

  if (response?.body == null) {
    logger.error(
      LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_FAILURE,
      {
        data: {
          response,
          httpRequest: httpRequestLogData,
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
      {
        data: {
          error,
          httpRequest: httpRequestLogData,
        },
      },
    );
    return emptyFailure();
  }

  logger.debug(
    LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_SUCCESS,
  );
  return successResult(parsedBody.access_token);
};
