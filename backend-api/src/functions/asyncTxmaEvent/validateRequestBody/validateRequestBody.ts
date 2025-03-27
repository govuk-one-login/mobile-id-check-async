import { validateSessionId } from "../../common/request/validateSessionId/validateSessionId";
import {
  TxmaBillingEventName,
  txmaBillingEventNames,
} from "../../services/events/types";
import { errorResult, Result, successResult } from "../../utils/result";
import { isString } from "../../utils/utils";

export function validateRequestBody(
  body: string | null,
): Result<IAsyncTxmaEventRequestBody> {
  if (body == null) {
    return errorResult({
      errorMessage: `Request body is either null or undefined.`,
    });
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch (error: unknown) {
    return errorResult({
      errorMessage: `Request body could not be parsed as JSON. ${error}`,
    });
  }
  const { sessionId, eventName } = parsedBody;

  const validateSessionIdResult = validateSessionId(sessionId);
  if (validateSessionIdResult.isError) {
    return validateSessionIdResult;
  }

  if (eventName == null) {
    return errorResult({
      errorMessage: `eventName in request body is either null or undefined.`,
    });
  }

  if (!isString(eventName)) {
    return errorResult({
      errorMessage: `eventName in request body is not of type string. eventName: ${eventName}`,
    });
  }

  if (eventName === "") {
    return errorResult({
      errorMessage: `eventName in request body is an empty string.`,
    });
  }

  if (!isEventName(eventName)) {
    return errorResult({
      errorMessage: `eventName in request body is invalid. eventName: ${eventName}`,
    });
  }

  return successResult({
    sessionId,
    eventName,
  });
}

function isEventName(eventName: string): eventName is TxmaBillingEventName {
  return (txmaBillingEventNames as unknown as string[]).includes(eventName);
}

export interface IAsyncTxmaEventRequestBody {
  sessionId: string;
  eventName: TxmaBillingEventName;
}
