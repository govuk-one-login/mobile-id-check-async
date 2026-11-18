import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { badRequestResponse, notImplementedResponse } from "../common/lambdaResponses";
import { logger } from "../common/logging/logger";
import { LogMessage } from "../common/logging/LogMessage";
import { setupLogger } from "../common/logging/setupLogger";
import { getHeader } from "../common/request/getHeader/getHeader";
import { errorResult, Result, successResult } from "../utils/result";
import { isString } from "../utils/utils";

export async function lambdaHandlerConstructor(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  setupLogger(context, getHeader(event.headers, "User-Agent"));
  logger.info(LogMessage.AUTH_SOURCE_CHECK_STARTED);

  const validateRequestBodyResult = validateRequestBody(event.body);
  if (validateRequestBodyResult.isError) {
    const { errorMessage } = validateRequestBodyResult.value;
    logger.error(LogMessage.AUTH_SOURCE_CHECK_REQUEST_BODY_INVALID, {
      errorMessage,
    });
    return badRequestResponse("invalid_request", errorMessage);
  }

  logger.info(LogMessage.AUTH_SOURCE_CHECK_COMPLETED);
  return notImplementedResponse;
}

function validateRequestBody(body: string | null): Result<IAsyncAuthSourceCheckRequestBody> {
  if (body == null) {
    return errorResult({
      errorMessage: `Request body is either null or undefined`
    });
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch (error: unknown) {
    return errorResult({
      errorMessage: `Request body could not be parsed as JSON: ${error}`,
    });
  }

  const stringFields = [
    "sessionId",
    "opaqueId",
    "userSurname",
    "userDateOfBirth",
    "validFrom",
    "validUntil",
    "issuingAuthority",
    "licenceNumber",
    "postcode",
  ];

  for (const field of stringFields) {
    const fieldKey = field as keyof typeof parsedBody;
    const value = parsedBody[fieldKey];
    if (value == null || value == undefined) {
      return errorResult({
        errorMessage: `${field} in request body is either null or undefined.`,
      });
    }
    if (!isString(value)) {
      return errorResult({
        errorMessage: `${field} in request body is not of type string. ${field}: ${value}`,
      });
    }
    if (value === "") {
      return errorResult({
        errorMessage: `${field} in request body is an empty string.`,
      });
    }
  }

  const value = parsedBody.userForenames;
  if (value == null || value == undefined) {
    return errorResult({
      errorMessage: `userForenames in request body is either null or undefined.`,
    });
  }
  if (!Array.isArray(value)) {
    return errorResult({
      errorMessage: `userForenames in request body is not of type Array. userForenames: ${JSON.stringify(value)}`,
    });
  }
  if (value.length === 0) {
    return errorResult({
      errorMessage: `userForenames in request body is an empty Array.`,
    });
  }
  for (let i = 0; i < value.length; i++) {
    const forename = value[i];
    if (!isString(forename)) {
      return errorResult({
        errorMessage: `userForenames[${i}] in request body is not of type string: ${forename}`,
      });
    }
  }

  return successResult({});
}


export interface IAsyncAuthSourceCheckRequestBody {
  sessionId: string;
  opaqueId: string;
  // TODO: and the rest.
}

export const lambdaHandler = lambdaHandlerConstructor.bind(null);
