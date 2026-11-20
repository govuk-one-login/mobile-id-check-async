import { errorResult, Result, successResult } from "../../utils/result";
import { isString, isStringArray } from "../../utils/utils";

export function validateRequestBody(
  body: string | null,
): Result<IAsyncAuthSourceCheckRequestBody> {
  if (body == null) {
    return errorResult({
      errorMessage: `Request body is either null or undefined.`,
    });
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return errorResult({
      errorMessage: `Request body could not be parsed as JSON.`,
    });
  }

  if (!(parsedBody instanceof Object) || parsedBody instanceof Array) {
    // Reject JSON docs: "null" "true" "false" "123" "[ ... ]"
    return errorResult({
      errorMessage: `Request body JSON is not structured as an Object`,
    });
  }

  const stringFields = [
    "sessionId",
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
        errorMessage: `${field} in request body is not of type string.`,
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
  // We permit userForenames to be empty; this does sometimes occur.
  if (!isStringArray(value, { allowEmpty: true })) {
    return errorResult({
      errorMessage: `userForenames in request body is not an Array<string>.`,
    });
  }

  return successResult({
    sessionId: parsedBody.sessionId,
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
  userSurname: string;
  userForenames: string[];
  userDateOfBirth: string;
  validFrom: string;
  validUntil: string;
  issuingAuthority: string;
  licenceNumber: string;
  postcode: string;
}
