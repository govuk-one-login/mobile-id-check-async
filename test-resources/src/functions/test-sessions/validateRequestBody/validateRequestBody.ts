import { APIGatewayEvent } from "aws-lambda";
import {
  BaseSessionAttributes,
  BiometricSessionFinishedAttributes,
  SessionAttributes,
} from "../../common/session/session";
import {
  emptyFailure,
  errorResult,
  Result,
  successResult,
} from "../../common/utils/result";
import { AttributeValue } from "@aws-sdk/client-dynamodb";

const validateRequestBody = (
  event: APIGatewayEvent,
): Result<SessionAttributes, void> => {
  const { body } = event;
  if (!body) return emptyFailure();
  const parsedBody = JSON.parse(body) as unknown;

  if (typeof parsedBody !== "object") return emptyFailure();
  if (parsedBody === null) return emptyFailure();

  const validKeys = [
    "clientId",
    "clientState",
    "createdAt",
    "govukSigninJourneyId",
    "issuer",
    "sessionId",
    "sessionState",
    "subjectIdentifier",
    "timeToLive",
    "opaqueId",
    "redirectUri",
    "documentType",
    "opaqueId",
  ];

  const parsedKeys = Object.keys(parsedBody);
  const isExpectedKeys = parsedKeys.every((key) => {
    validKeys.includes(key);
  });

  if (!isExpectedKeys) return emptyFailure();

  if (!isBaseSessionAttributes(parsedBody)) throw Error("");

  return successResult(parsedBody);
};

function isBaseSessionAttributes(obj: any): obj is SessionAttributes {
  if (typeof obj.clientId !== "string") return false;
  if (typeof obj.clientState !== "string") return false;
  if (typeof obj.createdAt !== "number") return false;
  if (typeof obj.govukSigninJourneyId !== "string") return false;
  if (typeof obj.issuer !== "string") return false;
  if (typeof obj.sessionId !== "string") return false;
  if (typeof obj.sessionState) return false;
  if (typeof obj.subjectIdentifier !== "string") return false;
  if (typeof obj.timeToLive !== "number") return false;
  return true;
}
