import { logger } from "../../common/logging/logger";
import { LogMessage } from "../../common/logging/LogMessage";
import {
  HttpError,
  ISendHttpRequest,
  sendHttpRequest as sendHttpRequestDefault,
  SuccessfulHttpResponse,
} from "../../adapters/http/sendHttpRequest";
import { emptyFailure, Result, successResult } from "../../utils/result";

export interface BiometricSession {
  id: string;
  finish: string;
}

let lastError: HttpError | null = null;

export function getLastError(): HttpError | null {
  return lastError;
}

export function isRetryableError(): boolean {
  if (!lastError || lastError.statusCode === undefined) {
    return false;
  }

  const retryableStatusCodes = [
    429, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
  ];

  return retryableStatusCodes.includes(lastError.statusCode);
}

export type GetBiometricSession = (
  baseUrl: string,
  sessionId: string,
  submitterKey: string,
  sendHttpRequest?: ISendHttpRequest,
) => Promise<Result<BiometricSession, void>>;

export const getBiometricSession: GetBiometricSession = async (
  baseUrl: string,
  sessionId: string,
  submitterKey: string,
  sendHttpRequest: ISendHttpRequest = sendHttpRequestDefault,
) => {
  const httpRequest = {
    url: `${baseUrl}/odata/v1/ODataServlet/Sessions('${sessionId}')`,
    method: "GET" as const,
    headers: {
      "X-Innovalor-Authorization": submitterKey,
      Accept: "application/json;odata.metadata=minimal",
      "Content-Type": "application/json;odata.metadata=minimal",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
  };
  const httpRequestLogData = {
    ...httpRequest,
    headers: {
      ...httpRequest.headers,
      "X-Innovalor-Authorization": "Secret value and cannot be logged",
    },
  };
  const retryConfig = {
    retryableStatusCodes: [
      429, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
    ],
    maxRetries: 3,
    initialDelayMs: 50,
    useExponentialBackoff: true,
    useJitter: true,
  };

  logger.debug(LogMessage.BIOMETRIC_SESSION_GET_FROM_READID_ATTEMPT, {
    data: {
      httpRequest: httpRequestLogData,
      sessionId,
    },
  });

  const getBiometricSessionResult: Result<SuccessfulHttpResponse, HttpError> =
    await sendHttpRequest(httpRequest, retryConfig);

  if (getBiometricSessionResult.isError) {
    lastError = getBiometricSessionResult.value;

    logger.error(LogMessage.BIOMETRIC_SESSION_GET_FROM_READID_FAILURE, {
      data: {
        error: lastError,
        httpRequest: httpRequestLogData,
        sessionId,
      },
    });

    return emptyFailure();
  }

  lastError = null;

  const getBiometricSessionResponse = getBiometricSessionResult.value;

  if (getBiometricSessionResponse?.body == null) {
    logger.error(LogMessage.BIOMETRIC_SESSION_GET_FROM_READID_FAILURE, {
      data: {
        getBiometricSessionResponse,
        httpRequest: httpRequestLogData,
        sessionId,
      },
    });
    return emptyFailure();
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(getBiometricSessionResponse.body);
  } catch (error) {
    logger.error(LogMessage.BIOMETRIC_SESSION_GET_FROM_READID_FAILURE, {
      data: {
        error,
        httpRequest: httpRequestLogData,
        sessionId,
      },
    });
    return emptyFailure();
  }

  logger.debug(LogMessage.BIOMETRIC_SESSION_GET_FROM_READID_SUCCESS, {
    data: {
      sessionId,
      finish: parsedBody.finish,
    },
  });

  return successResult(parsedBody);
};
