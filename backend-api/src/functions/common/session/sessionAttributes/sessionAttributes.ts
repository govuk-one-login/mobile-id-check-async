import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { NativeAttributeValue, unmarshall } from "@aws-sdk/util-dynamodb";
import { Result, emptyFailure, successResult } from "../../../utils/result";
import {
  BaseSessionAttributes,
  BiometricSessionFinishedAttributes,
  BiometricTokenIssuedSessionAttributes,
  SessionState,
} from "../session";

export const getBaseSessionAttributes = (
  item: Record<string, AttributeValue> | undefined,
): Result<BaseSessionAttributes, void> => {
  if (item == null) return emptyFailure();

  const sessionAttributes = unmarshall(item);
  if (!isBaseSessionAttributes(sessionAttributes)) return emptyFailure();

  return successResult(sessionAttributes);
};

export const isCommonSessionAttributes = (
  item: Record<string, NativeAttributeValue>,
): boolean => {
  if (typeof item.clientId !== "string") return false;
  if (typeof item.clientState !== "string") return false;
  if (typeof item.createdAt !== "number") return false;
  if (typeof item.govukSigninJourneyId !== "string") return false;
  if (typeof item.issuer !== "string") return false;
  if (typeof item.sessionId !== "string") return false;
  if (typeof item.sessionState !== "string") return false;
  if (typeof item.subjectIdentifier !== "string") return false;
  if (typeof item.timeToLive !== "number") return false;
  if ("redirectUri" in item && typeof item.redirectUri !== "string") {
    return false;
  }
  return true;
};

export const isBaseSessionAttributes = (
  item: Record<string, NativeAttributeValue>,
): item is BaseSessionAttributes => {
  if (!isCommonSessionAttributes(item)) return false;
  return true;
};

export const getBiometricTokenIssuedSessionAttributes = (
  item: Record<string, AttributeValue> | undefined,
): Result<BiometricTokenIssuedSessionAttributes, void> => {
  if (item == null) return emptyFailure();

  const sessionAttributes = unmarshall(item);
  if (!isBiometricTokenIssuedSessionAttributes(sessionAttributes))
    return emptyFailure();

  return successResult(sessionAttributes);
};

export const isBiometricTokenIssuedSessionAttributes = (
  item: Record<string, NativeAttributeValue>,
): item is BiometricTokenIssuedSessionAttributes => {
  if (!isCommonSessionAttributes(item)) return false;
  if (typeof item.documentType !== "string") return false;
  if (typeof item.opaqueId !== "string") return false;
  return true;
};

export const getBiometricSessionFinishedSessionAttributes = (
  item: Record<string, AttributeValue> | undefined,
): Result<BiometricSessionFinishedAttributes, void> => {
  if (item == null) return emptyFailure();

  const sessionAttributes = unmarshall(item);
  if (!isBiometricSessionFinishedSessionAttributes(sessionAttributes))
    return emptyFailure();

  return successResult(sessionAttributes);
};

export const isBiometricSessionFinishedSessionAttributes = (
  item: Record<string, NativeAttributeValue>,
): item is BiometricSessionFinishedAttributes => {
  if (!isCommonSessionAttributes(item)) return false;
  if (typeof item.documentType !== "string") return false;
  if (typeof item.opaqueId !== "string") return false;
  if (typeof item.biometricSessionId !== "string") return false;
  return true;
};

export function isOlderThan60minutes(createdAtInMilliseconds: number) {
  const SIXTY_MINUTES_IN_MILLISECONDS = 3600000;
  const validFrom = Date.now() - SIXTY_MINUTES_IN_MILLISECONDS;
  return createdAtInMilliseconds < validFrom;
}
