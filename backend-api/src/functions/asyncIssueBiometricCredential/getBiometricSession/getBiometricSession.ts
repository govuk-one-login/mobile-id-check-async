import { logger } from "../../common/logging/logger";
import { LogMessage } from "../../common/logging/LogMessage";
import {
  HttpError,
  ISendHttpRequest,
  RetryConfig,
  sendHttpRequest as sendHttpRequestDefault,
  SuccessfulHttpResponse,
} from "../../adapters/http/sendHttpRequest";
import { Result, successResult, errorResult } from "../../utils/result";

export interface BiometricSession {
  id: string;
  finish: string;
}

export interface BiometricSessionError {
  statusCode?: number;
  message: string;
  isRetryable: boolean;
}

export type GetBiometricSession = (
  baseUrl: string,
  biometricSessionId: string,
  viewerKey: string,
  sendHttpRequest?: ISendHttpRequest,
) => Promise<Result<BiometricSession, BiometricSessionError>>;

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

  const retryConfig: RetryConfig = {
    retryableStatusCodes: [
      429, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
    ],
    delayInMillis: 50,
  };

  logger.debug(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_ATTEMPT, {
    data: {
      biometricSessionId,
    },
  });

  const getBiometricSessionResult: Result<SuccessfulHttpResponse, HttpError> =
    await sendHttpRequest(httpRequest, retryConfig);

  if (getBiometricSessionResult.isError) {
    const error = getBiometricSessionResult.value;
    const statusCode = error.statusCode ? Number(error.statusCode) : undefined;

    const isRetryable =
      !statusCode ||
      statusCode === 429 ||
      (statusCode >= 500 && statusCode < 600);

    logger.error(
      LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_FAILURE,
      {
        data: {
          error,
          isRetryable,
          biometricSessionId,
        },
      },
    );

    return errorResult({
      statusCode,
      message: "Failed to retrieve biometric session",
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
          biometricSessionId,
        },
      },
    );

    return errorResult({
      message: "Empty response body from ReadID",
      isRetryable: true,
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
          biometricSessionId,
        },
      },
    );

    return errorResult({
      message: "Failed to parse response JSON",
      isRetryable: false,
    });
  }

  // Check if the response has the expected structure
  if (!parsedBody || typeof parsedBody.finish !== "string") {
    logger.error(
      LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_FAILURE,
      {
        data: {
          parsedBody,
          biometricSessionId,
        },
      },
    );

    return errorResult({
      message: "Invalid response structure from ReadID",
      isRetryable: false,
    });
  }

  logger.debug(LogMessage.ISSUE_BIOMETRIC_CREDENTIAL_GET_FROM_READID_SUCCESS, {
    data: {
      biometricSessionId,
      finish: parsedBody.finish,
    },
  });

  return successResult(parsedBody);
};
