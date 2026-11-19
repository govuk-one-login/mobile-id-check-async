import { errorResult, Result, successResult } from "../../utils/result";
import { isString } from "../../utils/utils";

export function validateRequestBody(
    body: string | null
): Result<IAsyncAuthSourceCheckRequestBody> {
  if (body == null) {
    return errorResult({
      errorMessage: `Request body is either null or undefined.`
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

  return successResult({
    sessionId: parsedBody.sessionId,
    opaqueId: parsedBody.opaqueId,
    userSurname: parsedBody.userSurname,
    userForenames: parsedBody.userForenames,
    userDateOfBirth: parsedBody.userDateOfBirth,
    validFrom: parsedBody.validFrom,
    validUntil: parsedBody.validUntil,
    issuingAuthority: parsedBody.issuingAuthority,
    licenceNumber: parsedBody.licenceNumber,
    postcode: parsedBody.postcode,
  });
}

export interface IAsyncAuthSourceCheckRequestBody {
  sessionId: string;
  opaqueId: string;
  userSurname: string;
  userForenames: string[];
  userDateOfBirth: string;
  validFrom: string;
  validUntil: string;
  issuingAuthority: string;
  licenceNumber: string;
  postcode: string;
}
