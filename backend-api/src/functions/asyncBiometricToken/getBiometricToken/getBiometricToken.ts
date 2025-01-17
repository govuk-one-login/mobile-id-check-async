import { logger } from "../../common/logging/logger";
import { LogMessage } from "../../common/logging/LogMessage";
import {
  HttpError,
  ISendHttpRequest,
  sendHttpRequest as sendHttpRequestDefault,
  SuccessfulHttpResponse,
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

  logger.debug(
    LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_ATTEMPT,
    {
      data: {
        httpRequest: httpRequestLogData,
      },
    },
  );
  const getBiometricTokenResult: Result<SuccessfulHttpResponse, HttpError> =
    await sendHttpRequest(httpRequest);
  if (getBiometricTokenResult.isError) {
    logger.error(
      LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_FAILURE,
      {
        data: {
          error: getBiometricTokenResult.value,
          httpRequest: httpRequestLogData,
        },
      },
    );

    return emptyFailure();
  }

  const getBiometricTokenResponse = getBiometricTokenResult.value;

  if (getBiometricTokenResponse?.body == null) {
    logger.error(
      LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_FAILURE,
      {
        data: {
          getBiometricTokenResponse,
          httpRequest: httpRequestLogData,
        },
      },
    );
    return emptyFailure();
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(getBiometricTokenResponse.body);
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
