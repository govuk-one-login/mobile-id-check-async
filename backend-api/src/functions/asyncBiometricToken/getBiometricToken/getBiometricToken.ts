import { logger } from "../../common/logging/logger";
import { LogMessage } from "../../common/logging/LogMessage";
import {
  ISendHttpRequest,
  sendHttpRequest,
} from "../../services/http/sendHttpRequest";
import { emptyFailure, Result, successResult } from "../../utils/result";

export type GetBiometricToken = (
  url: string,
  submitterKey: string,
  sendHttpRequestAdapter?: ISendHttpRequest,
) => Promise<Result<string, void>>;

export const getBiometricToken: GetBiometricToken = async (
  url: string,
  submitterKey: string,
  sendHttpRequestAdapter: ISendHttpRequest = sendHttpRequest,
) => {
  const readIdUrl = `${url}/oauth/token?grant_type=client_credentials`;
  const headers = {
    "X-Innovalor-Authorization": submitterKey,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const httpRequest = {
    url: readIdUrl,
    method: "POST" as const,
    headers,
  };
  const httpRequestLogData = {
    url: httpRequest.url,
    method: httpRequest.method,
    //Omitting submitterKey in headers as it is a secret and should not be logged
    headers: {
      "Content-Type": httpRequest.headers["Content-Type"],
    },
  };

  console.log(httpRequestLogData);

  let response;
  try {
    logger.debug(
      LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_ATTEMPT,
      {
        data: {
          httpRequestLogData,
        },
      },
    );
    response = await sendHttpRequestAdapter(httpRequest);
  } catch (error) {
    logger.error(
      LogMessage.BIOMETRIC_TOKEN_GET_BIOMETRIC_TOKEN_FROM_READID_FAILURE,
      {
        data: {
          error,
          httpRequestLogData,
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
          httpRequestLogData,
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
          httpRequestLogData,
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
