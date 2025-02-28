import { APIGatewayProxyResult } from "aws-lambda";
import { badRequestResponse } from "../../common/lambdaResponses";
import { logger } from "../../common/logging/logger";
import { LogMessage } from "../../common/logging/LogMessage";
import { errorResult, Result, successResult } from "../../utils/result";

export function validateRequestBody(
  body: string | null,
): Result<IAsyncTxmaEventRequestBody, IHandleErrorResponse> {
  if (body == null) {
    return errorResult({
      handleErrorResponse: getErrorResponseHandler({
        errorMessage: `Request body is either null or undefined.`,
      }),
    });
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch (error: unknown) {
    return errorResult({
      handleErrorResponse: getErrorResponseHandler({
        errorMessage: `Request body could not be parsed as JSON. ${error}`,
      }),
    });
  }
  const { sessionId, eventName } = parsedBody;

  if (sessionId == null) {
    return errorResult({
      handleErrorResponse: getErrorResponseHandler({
        errorMessage: `sessionId in request body is either null or undefined.`,
      }),
    });
  }

  if (!isString(sessionId)) {
    return errorResult({
      handleErrorResponse: getErrorResponseHandler({
        errorMessage: `sessionId in request body is not of type string. sessionId: ${sessionId}`,
      }),
    });
  }

  if (sessionId === "") {
    return errorResult({
      handleErrorResponse: getErrorResponseHandler({
        errorMessage: `sessionId in request body is an empty string.`,
      }),
    });
  }

  if (eventName == null) {
    return errorResult({
      handleErrorResponse: getErrorResponseHandler({
        errorMessage: `eventName in request body is either null or undefined.`,
      }),
    });
  }

  if (!isString(eventName)) {
    return errorResult({
      handleErrorResponse: getErrorResponseHandler({
        errorMessage: `eventName in request body is not of type string. eventName: ${eventName}`,
      }),
    });
  }

  if (eventName === "") {
    return errorResult({
      handleErrorResponse: getErrorResponseHandler({
        errorMessage: `eventName in request body is an empty string.`,
      }),
    });
  }

  if (!isAllowableEventName(eventName)) {
    return errorResult({
      handleErrorResponse: getErrorResponseHandler({
        errorMessage: `eventName in request body is invalid. eventName: ${eventName}`,
      }),
    });
  }

  return successResult({
    sessionId,
    eventName,
  });
}

function isAllowableEventName(eventName: string): eventName is EventName {
  return allowableEventNames.includes(eventName);
}

function isString(field: unknown): field is string {
  return typeof field === "string";
}

export interface IAsyncTxmaEventRequestBody {
  sessionId: string;
  eventName: EventName;
}

type EventName = (typeof allowableEventNames)[number];

const allowableEventNames = [
  "DCMAW_ASYNC_HYBRID_BILLING_STARTED",
  "DCMAW_ASYNC_IPROOV_BILLING_STARTED",
  "DCMAW_ASYNC_READID_NFC_BILLING_STARTED",
];

export interface IHandleErrorResponse {
  handleErrorResponse: () => APIGatewayProxyResult;
}

function getErrorResponseHandler({ errorMessage }: { errorMessage: string }) {
  return () => {
    logger.error(LogMessage.TXMA_EVENT_REQUEST_BODY_INVALID, {
      errorMessage,
    });
    return badRequestResponse("invalid_request", errorMessage);
  };
}
