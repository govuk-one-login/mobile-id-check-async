import { logger } from "../../common/logging/logger";
import { LogMessage } from "../../common/logging/LogMessage";
import {
  HttpError,
  ISendHttpRequest,
  sendHttpRequest as sendHttpRequestDefault,
  SuccessfulHttpResponse,
} from "../../adapters/http/sendHttpRequest";
import { Result, successResult, errorResult } from "../../utils/result";

export interface BiometricSession {
  finish: string;
}

export interface GetBiometricSessionError {
  isRetryable: boolean;
}

export type GetBiometricSession = (
  baseUrl: string,
  biometricSessionId: string,
  viewerKey: string,
  sendHttpRequest?: ISendHttpRequest,
) => Promise<Result<BiometricSession, GetBiometricSessionError>>;

export const getBiometricSession: GetBiometricSession = async (
  baseUrl: string,
  biometricSessionId: string,
  viewerKey: string,
  sendHttpRequest: ISendHttpRequest = sendHttpRequestDefault,
) => {
  const httpRequest = {
    url: `${baseUrl}/odata/v1/ODataServlet/Sessions('${biometricSessionId}')`,
    method: "GET" as const,
    headers: {
      "X-Innovalor-Authorization": viewerKey,
      Accept: "application/json;odata.metadata=minimal",
      "Content-Type": "application/json;odata.metadata=minimal",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
  };

  const retryConfig = {
    retryableStatusCodes: [
      429, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
    ],
    delayInMillis: 50,
  };

  logger.debug(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_ATTEMPT);

  const getBiometricSessionResult: Result<SuccessfulHttpResponse, HttpError> =
    await sendHttpRequest(httpRequest, retryConfig);

  if (getBiometricSessionResult.isError) {
    const error = getBiometricSessionResult.value;
    const statusCode = error.statusCode ? Number(error.statusCode) : undefined;
    const retryableStatusCodes = retryConfig.retryableStatusCodes;

    const isRetryable =
      !statusCode || retryableStatusCodes.includes(statusCode);

    logger.error(
      LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_FAILURE,
      {
        data: {
          error,
          isRetryable,
        },
      },
    );

    return errorResult({
      isRetryable,
    });
  }

  const getBiometricSessionResponse = getBiometricSessionResult.value;

  if (getBiometricSessionResponse?.body == null) {
    logger.error(
      LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_FAILURE,
      {
        data: {
          getBiometricSessionResponse,
        },
      },
    );

    return errorResult({
      isRetryable: false,
    });
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(getBiometricSessionResponse.body);
  } catch (error) {
    logger.error(
      LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_FAILURE,
      {
        data: {
          error,
        },
      },
    );

    return errorResult({
      isRetryable: false,
    });
  }

  // Check if the response has the expected structure
  if (!parsedBody || typeof parsedBody.finish !== "string") {
    logger.error(
      LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_FAILURE,
      {
        data: {
          invalidFinishProperty: parsedBody?.finish,
        },
      },
    );

    return errorResult({
      isRetryable: false,
    });
  }

  logger.debug(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_SUCCESS, {
    data: {
      finish: parsedBody.finish,
    },
  });

  return successResult(parsedBody);
};
